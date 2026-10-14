# adapters

The only layer that talks to Codeforces or LeetCode (via `@tauri-apps/plugin-http`).
Each adapter normalizes platform responses into shared domain types; nothing above
this folder imports platform response shapes. `leetcode/` wraps the unofficial
GraphQL API and must fail soft.
