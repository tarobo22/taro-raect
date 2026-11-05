# Remaining core flows

New development on `codex/complete-core-flows-20261106`. Existing tests are preserved.

| Feature | RED | GREEN | Scope |
|---|---|---|---|
| Journal retry identity | Create payload had no request identity and retries changed nothing | 13 client cases and TypeScript | Reuse persisted operation identity after a lost acknowledgement and form remount; new content gets a new identity |
| Partial dashboard refresh | Missing independent endpoint loader | 16 client cases and TypeScript | One failed endpoint keeps successful data and the previous good history; late older refreshes are ignored |
| Versioned editor and durable drafts | Missing draft session / decoder discarded versions | 20 client cases and TypeScript | Preserve revisions across late restore and save acknowledgements; send expectedVersion on edits |

The request receipt is persisted before sending and cleared only after a validated server acknowledgement.
Actual concurrent database behavior is tested in taro-back's journal retry integration tests.

## Explicit conflict resolution

The browser scenario first reached a 409 with the draft intact, then failed because the latest-entry action was missing.
After implementation it passed: committed response lost, page reload, same request identity, exactly one record, stale edit rejected, explicit rebase preserving the local text, successful version 3.
Both clients typecheck; the browser scenario exercises the shared screen, not native gesture/haptic behavior.

## Durable reading/conversation requests and follow-up drafts

RED: a remounted request generated a new identity, storage failure still sent a request, and successful transport cleared its receipt before screen acknowledgement.
The browser also exposed that follow-up text was not persisted.
GREEN: common client cases 23 (RN has 3 additional OTA cases), TypeScript, and isolated browser flows.
Requests reserve their identity before sending and retain it until the active screen acknowledges the result.
Follow-up drafts retain parentId across reload; AI consent is selected again by the user.

## Empty saved entries

An additional browser RED showed an empty saved entry importing an unrelated new-entry draft.
Explicit saved-entry initialization preserves an empty body. The four isolated browser scenarios now cover this regression as well.
