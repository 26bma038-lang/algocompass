//! Repairs sqlx migration checksums that differ only by line endings.
//!
//! sqlx stores a SHA-384 of each applied migration's SQL in `_sqlx_migrations` and refuses to
//! start if the bundled file's checksum changes ("migration N was previously applied but has
//! been modified"). v1.3.0 shipped a migration with CRLF line endings while users' databases had
//! the LF version applied, which bricked startup. Before the sql plugin migrates, this rewrites a
//! stored checksum to the bundled one ONLY when the stored value equals the checksum of the same
//! SQL with the other line endings. Real content changes are never touched.

use std::path::Path;

use sha2::{Digest, Sha384};
use sqlx::{sqlite::SqliteConnectOptions, ConnectOptions, Row};

/// One migration as the app bundles it.
pub struct Bundled {
    pub version: i64,
    pub sql: &'static str,
}

fn checksum(sql: &str) -> Vec<u8> {
    Sha384::digest(sql.as_bytes()).to_vec()
}

/// The bundled checksum to store, if `stored` differs from the bundled SQL's checksum only
/// because of LF vs CRLF line endings. `None` means leave the row alone.
pub fn repaired_checksum(bundled_sql: &str, stored: &[u8]) -> Option<Vec<u8>> {
    let bundled = checksum(bundled_sql);
    if stored == bundled.as_slice() {
        return None;
    }
    let lf = bundled_sql.replace("\r\n", "\n");
    let crlf = lf.replace('\n', "\r\n");
    if stored == checksum(&lf).as_slice() || stored == checksum(&crlf).as_slice() {
        Some(bundled)
    } else {
        None
    }
}

/// Repairs line-ending-only checksum mismatches in the database at `db_path`, if it exists.
/// Returns the repaired migration versions. Errors are reported, never fatal.
pub async fn heal(db_path: &Path, migrations: &[Bundled]) -> Result<Vec<i64>, sqlx::Error> {
    if !db_path.exists() {
        return Ok(Vec::new());
    }
    let mut conn = SqliteConnectOptions::new()
        .filename(db_path)
        .create_if_missing(false)
        .connect()
        .await?;

    let has_table: Option<String> = sqlx::query_scalar(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name = '_sqlx_migrations'",
    )
    .fetch_optional(&mut conn)
    .await?;
    if has_table.is_none() {
        return Ok(Vec::new());
    }

    let rows = sqlx::query("SELECT version, checksum FROM _sqlx_migrations")
        .fetch_all(&mut conn)
        .await?;
    let mut repaired = Vec::new();
    for row in rows {
        let version: i64 = row.try_get("version")?;
        let stored: Vec<u8> = row.try_get("checksum")?;
        let Some(m) = migrations.iter().find(|m| m.version == version) else {
            continue;
        };
        if let Some(fixed) = repaired_checksum(m.sql, &stored) {
            sqlx::query("UPDATE _sqlx_migrations SET checksum = ? WHERE version = ?")
                .bind(fixed)
                .bind(version)
                .execute(&mut conn)
                .await?;
            repaired.push(version);
        }
    }
    Ok(repaired)
}

#[cfg(test)]
mod tests {
    use super::*;

    const LF: &str = "CREATE TABLE a (id INTEGER);\nCREATE TABLE b (id INTEGER);\n";
    const CRLF: &str = "CREATE TABLE a (id INTEGER);\r\nCREATE TABLE b (id INTEGER);\r\n";

    #[test]
    fn identical_checksum_is_left_alone() {
        assert_eq!(repaired_checksum(LF, &checksum(LF)), None);
    }

    #[test]
    fn lf_stored_crlf_bundled_is_repaired() {
        assert_eq!(repaired_checksum(CRLF, &checksum(LF)), Some(checksum(CRLF)));
    }

    #[test]
    fn crlf_stored_lf_bundled_is_repaired() {
        assert_eq!(repaired_checksum(LF, &checksum(CRLF)), Some(checksum(LF)));
    }

    #[test]
    fn real_content_change_is_never_repaired() {
        let changed = "CREATE TABLE a (id INTEGER, x TEXT);\nCREATE TABLE b (id INTEGER);\n";
        assert_eq!(repaired_checksum(changed, &checksum(LF)), None);
        assert_eq!(repaired_checksum(changed, &checksum(CRLF)), None);
    }

    #[test]
    fn heal_rewrites_only_line_ending_rows() {
        tauri::async_runtime::block_on(async {
            let dir = std::env::temp_dir().join(format!("algocompass-heal-{}", std::process::id()));
            std::fs::create_dir_all(&dir).unwrap();
            let db = dir.join("test.db");
            let _ = std::fs::remove_file(&db);
            let mut conn = SqliteConnectOptions::new()
                .filename(&db)
                .create_if_missing(true)
                .connect()
                .await
                .unwrap();
            sqlx::query("CREATE TABLE _sqlx_migrations (version BIGINT PRIMARY KEY, checksum BLOB NOT NULL)")
                .execute(&mut conn)
                .await
                .unwrap();
            let other = "CREATE TABLE c (id INTEGER);\n";
            for (v, sum) in [(1i64, checksum(LF)), (2, checksum("something else entirely"))] {
                sqlx::query("INSERT INTO _sqlx_migrations (version, checksum) VALUES (?, ?)")
                    .bind(v)
                    .bind(sum)
                    .execute(&mut conn)
                    .await
                    .unwrap();
            }
            drop(conn);

            let bundled = [Bundled { version: 1, sql: CRLF }, Bundled { version: 2, sql: other }];
            let repaired = heal(&db, &bundled).await.unwrap();
            assert_eq!(repaired, vec![1]);
            // A second run finds nothing left to repair.
            assert!(heal(&db, &bundled).await.unwrap().is_empty());
            let _ = std::fs::remove_dir_all(&dir);
        });
    }
}
