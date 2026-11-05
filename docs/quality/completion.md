# Remaining core flows

New development on `codex/complete-core-flows-20261106`. Existing tests are preserved.

| Feature | RED | GREEN | Scope |
|---|---|---|---|
| Journal retry identity | Create payload had no request identity and retries changed nothing | 13 client cases and TypeScript | Reuse persisted operation identity after a lost acknowledgement and form remount; new content gets a new identity |

The request receipt is persisted before sending and cleared only after a validated server acknowledgement.
Actual concurrent database behavior is tested in taro-back's journal retry integration tests.
