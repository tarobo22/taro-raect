# Remaining core flows

New development on `codex/complete-core-flows-20261106`. Existing tests are preserved.

| Feature | RED | GREEN | Scope |
|---|---|---|---|
| Journal retry identity | Create payload had no request identity and retries changed nothing | 13 client cases and TypeScript | Reuse persisted operation identity after a lost acknowledgement and form remount; new content gets a new identity |
| Partial dashboard refresh | Missing independent endpoint loader | 16 client cases and TypeScript | One failed endpoint keeps successful data and the previous good history; late older refreshes are ignored |
| Versioned editor and durable drafts | Missing draft session / decoder discarded versions | 20 client cases and TypeScript | Preserve revisions across late restore and save acknowledgements; send expectedVersion on edits |

The request receipt is persisted before sending and cleared only after a validated server acknowledgement.
Actual concurrent database behavior is tested in taro-back's journal retry integration tests.
