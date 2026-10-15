use std::{
    sync::Mutex,
    time::{Duration, SystemTime, UNIX_EPOCH},
};

use serde::Deserialize;
use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Emitter, Manager, Runtime, State, Wry,
};
use tauri_plugin_notification::NotificationExt;
use tauri_plugin_sql::{Migration, MigrationKind};
use tauri_plugin_store::StoreExt;

/// Must match `DB_URL` in src/data/db.ts.
const DB_URL: &str = "sqlite:algocompass.db";

/// Passed by the autostart entry: start hidden in the tray.
const MINIMIZED_ARG: &str = "--minimized";
/// Remembers which reminders already fired, across restarts.
const REMINDER_STORE: &str = "reminders.json";
/// How often the scheduler wakes. Leads are 10 minutes or more, so 15s is plenty.
const TICK: Duration = Duration::from_secs(15);
/// Fired keys older than this are forgotten.
const FIRED_TTL_SECS: u64 = 3 * 24 * 60 * 60;

/// Schema migrations. The SQL files are shared with the TS test harness (sql.js).
fn migrations() -> Vec<Migration> {
    vec![
        Migration {
            version: 1,
            description: "init",
            sql: include_str!("../migrations/0001_init.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 2,
            description: "lc_problems",
            sql: include_str!("../migrations/0002_lc_problems.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 3,
            description: "recommender",
            sql: include_str!("../migrations/0003_recommender.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 4,
            description: "quests",
            sql: include_str!("../migrations/0004_quests.sql"),
            kind: MigrationKind::Up,
        },
    ]
}

/// One reminder pushed by the frontend (src/engine/notifications.ts builds the list).
#[derive(Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
struct Reminder {
    key: String,
    at: u64,
    expires_at: u64,
    title: String,
    body: String,
}

/// The current schedule. Rust owns firing, so reminders arrive even while the
/// window (and its webview) sits hidden in the tray.
#[derive(Default)]
struct Reminders(Mutex<Vec<Reminder>>);

/// The tray menu's status line ("Quests 1/3"), kept so the frontend can update it.
struct TrayStatus(MenuItem<Wry>);

fn now_secs() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0)
}

#[tauri::command]
fn set_reminders(items: Vec<Reminder>, state: State<Reminders>) {
    if let Ok(mut list) = state.0.lock() {
        *list = items;
    }
}

#[tauri::command]
fn set_tray_status(text: String, app: AppHandle, status: State<TrayStatus>) {
    let _ = status.0.set_text(&text);
    if let Some(tray) = app.tray_by_id("main-tray") {
        let _ = tray.set_tooltip(Some(format!("AlgoCompass · {text}")));
    }
}

/// Fires due reminders: once each, only inside their [at, expires_at) window.
fn fire_due<R: Runtime>(app: &AppHandle<R>) {
    let now = now_secs();
    let due: Vec<Reminder> = match app.state::<Reminders>().0.lock() {
        Ok(list) => list
            .iter()
            .filter(|r| r.at <= now && now < r.expires_at)
            .cloned()
            .collect(),
        Err(_) => return,
    };
    let Ok(store) = app.store(REMINDER_STORE) else {
        return;
    };
    let mut changed = false;
    for r in due {
        if store.get(&r.key).is_some() {
            continue;
        }
        let _ = app
            .notification()
            .builder()
            .title(&r.title)
            .body(&r.body)
            .show();
        store.set(r.key.clone(), serde_json::json!(now));
        changed = true;
    }
    // Forget old keys so the file stays small.
    for (key, value) in store.entries() {
        if value
            .as_u64()
            .is_some_and(|t| now.saturating_sub(t) > FIRED_TTL_SECS)
        {
            store.delete(&key);
            changed = true;
        }
    }
    if changed {
        let _ = store.save();
    }
}

fn show_main_window<R: Runtime>(app: &AppHandle<R>) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.unminimize();
        let _ = window.show();
        let _ = window.set_focus();
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(
            tauri_plugin_autostart::Builder::new()
                .arg(MINIMIZED_ARG)
                .build(),
        )
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_http::init())
        .plugin(
            tauri_plugin_sql::Builder::new()
                .add_migrations(DB_URL, migrations())
                .build(),
        )
        .plugin(tauri_plugin_opener::init())
        .manage(Reminders::default())
        .invoke_handler(tauri::generate_handler![set_reminders, set_tray_status])
        .setup(|app| {
            let open = MenuItem::with_id(app, "open", "Open AlgoCompass", true, None::<&str>)?;
            let sync = MenuItem::with_id(app, "sync", "Sync now", true, None::<&str>)?;
            // Informational line, updated by the frontend.
            let status = MenuItem::with_id(app, "status", "Quests: after the first sync", false, None::<&str>)?;
            let quit = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let menu = Menu::with_items(
                app,
                &[
                    &open,
                    &sync,
                    &PredefinedMenuItem::separator(app)?,
                    &status,
                    &PredefinedMenuItem::separator(app)?,
                    &quit,
                ],
            )?;
            app.manage(TrayStatus(status));

            let mut tray = TrayIconBuilder::with_id("main-tray")
                .tooltip("AlgoCompass")
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| match event.id().as_ref() {
                    "open" => show_main_window(app),
                    "sync" => {
                        let _ = app.emit("tray-sync", ());
                    }
                    "quit" => app.exit(0),
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        show_main_window(tray.app_handle());
                    }
                });
            if let Some(icon) = app.default_window_icon() {
                tray = tray.icon(icon.clone());
            }
            tray.build(app)?;

            // The window starts hidden (tauri.conf.json), so a login launch never flashes it.
            if !std::env::args().any(|a| a == MINIMIZED_ARG) {
                show_main_window(app.handle());
            }

            let handle = app.handle().clone();
            std::thread::spawn(move || loop {
                std::thread::sleep(TICK);
                fire_due(&handle);
            });
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
