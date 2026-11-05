# Browser integration checks

These scenarios use the actual browser and FastAPI/PostgreSQL API through the web proxy.
Use an isolated database and separate preview/API ports. Never point them at production.

```powershell
npm ci
npx playwright install chromium
# Start FastAPI against the isolated test database on 8818.
# Build the web app, then start its preview with VITE_API_PROXY=http://127.0.0.1:8818 on 8817.
$env:YEOUN_WEB_URL='http://127.0.0.1:8817'
node --test tests/e2e/*.test.mjs
```

`YEOUN_TEST_ARTIFACTS` overrides the screenshot directory (default `.local/e2e`).
`YEOUN_PLAYWRIGHT_MODULE` may point at an existing compatible Playwright module in a managed workstation.

- Lost committed response, reload, retry with the same identity, one record, edit conflict and explicit rebase.
- Three-card selection/result, choices without automatic submission, basic guidance, follow-up draft/parent restoration.
- Failed tarot history endpoint with a working journal form.

GPT is not selected. The scenarios use fresh guest contexts; journal records are cleaned up by owner-scoped HTTP calls.
Other scenario data is confined to the isolated test database.
