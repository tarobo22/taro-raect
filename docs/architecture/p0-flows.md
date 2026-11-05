# P0 frontend flows

S00 explicitly creates a `/v2/sessions` guest connection. Existing malformed or expired credentials remain stored and show a reconnect notice; they are never replaced automatically. Bootstrap must succeed before authenticated dashboard loading. The existing v1 journal and basic conversation flows continue to use the same bearer.

S04/S08/S20 discover candidate/published deck versions and retain each reading's deck ID. Card images use `contain`, preserve the original artwork, and offer a visible image retry. Source pages, license, hash and manifest check date are shown without presenting a candidate as approved final art.

S19 stores separate current-input, chosen-journal and cloud-transcription consent events. S25 fetches owned journals and confirms at most three IDs. Requests contain only this explicit selection. The server rechecks current policy, ownership and deletion state.

Daily and three-card flows use `/v2/readings`. Three-card selection sends ordered opaque slot IDs plus `expected_version`; the client never learns unselected card IDs. The existing one/five-card question controls and basic local conversation remain accessible through v1. V2 histories are displayed alongside earlier histories without disabling the journal when an endpoint fails.

S24 reads persisted jobs, shows real states, offers cancellation and explicit retry with an additional-request notice, and opens only successful committed results. Status polling never submits AI work. Request identities are persisted through the existing operation receipt adapter; stale reads are ignored when a component unmounts. Home offers restoration of the last accepted job and the tarot form restores an unfinished reading.

S22 submits export/erase requests with a durable identity and exact erase confirmation, stores the receipt for status-only access, and waits for server completion. Downloads require the session bearer and ZIP content. S23 sends rating/reason/comment with at most one explicit owned target; no journal body is attached automatically.

Cloud voice selects a file and explicitly submits multipart audio after independent consent. The result is editable, applies to the existing draft, and never sends a conversation automatically. Device voice stays available. Native file selection/download requires `NativeModules.YeounFiles`; older native builds show an unavailable notice. Its interface is `chooseAudio(maxBytes,maxDurationMs)` and `downloadPrivate(url,bearer,filename,maxBytes)`. The web adapter uses a file picker and authenticated Blob ZIP download. Tests use no real microphone or external AI provider.

All mutations use `X-Idempotency-Key` UUID headers. V2 schemas use snake_case. AI provider availability currently comes from existing `experience-config.aiAvailable`, since the exact bootstrap contract has no provider-capabilities property. The backend owns policy enforcement, final resource versions, cancellation races and result validation.

Verification: new contract and transcript draft tests, the unchanged existing unit suites, TypeScript checks for both apps, and web production build. Browser integration and native baseline verification run after the backend branches are merged.
