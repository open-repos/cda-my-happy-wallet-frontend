# Frontend Testing Strategy

## Executable Web test stack

The Web application uses Vite 6, React 18, Vitest 4 and jsdom 26. Testing
Library 16 exercises React 18 components and hooks. Versions are pinned by
`package-lock.json`; use `npm ci` rather than installing another test runner.
GitHub's Web quality workflow runs on Node 22. See
[`AGENTS.md`](../AGENTS.md) for the complete validation contract.

`vitest.config.js` discovers `test/vitest/**/*.test.{js,jsx}` and loads
`test/vitest/setup.js`. The setup provides DOM assertions and a local category
icon fixture. Unit tests replace service or HTTP boundaries with controlled
fixtures; they do not need a running backend, credentials or production data.

The four Node characterization suites remain separate commands. `npm test`
checks generated design tokens and runs the Vitest suites; it does not run those
Node scripts or the Playwright tests.

## Coverage by boundary

| Boundary                           | Representative tests                                                                                                                             | Behavior protected                                                                                                                                                      |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| HTTP contracts                     | `apiResponse.test.mjs`, `apiPayloadCreator.test.mjs`, `budgetService.test.js`, `monthlyEventsService.test.js`, `oneOffOperationsService.test.js` | Response validation, payloads, pagination and API errors                                                                                                                |
| Fixed budget and remaining balance | `resteAVivreCalculator.test.mjs`, `useResteAVivre.test.jsx`, `useOperationsFixes.test.jsx`                                                       | Calculation and hook behavior                                                                                                                                           |
| One-off operations hook            | `useOneOffOperations.test.jsx`                                                                                                                   | Initial load, recoverable errors, cursor pagination, duplicate rows, pending-page guard, create/update/delete and saved-write/failed-refresh distinction                |
| Monthly events hook                | `useMonthlyEvents.test.jsx`                                                                                                                      | Selected month, empty results, failed reads, create/update/delete, pending refresh and recovery without replaying a write                                               |
| Budget calendar hook               | `useBudgetCalendar.test.jsx`                                                                                                                     | Leap-year boundaries, day/month filters, independent section failures, future periods, pagination, occurrence commands, closed periods and already-resolved occurrences |
| Analytics and charts               | `useAnalytics.test.jsx`, `analyticsExplorer.test.js`, `analyticsChartOptions.test.js`, `eChart.test.jsx`                                         | Query constraints, stale responses, aggregates and chart rendering contracts                                                                                            |
| Pages and forms                    | `oneOffOperationsPage.test.jsx`, `monthlyEventsPage.test.jsx`, `budgetCalendarPage.test.jsx`, `analyticsPage.test.jsx`                           | User actions, form validation and loading/empty/error presentation                                                                                                      |

Vitest filenames in this table are relative to `test/vitest/`; the `.mjs`
characterization suites live directly under `test/`. This is a map of existing
checks, not a claim of complete product or line coverage.

The hook suites added for [#59](https://github.com/open-repos/cda-my-happy-wallet-frontend/issues/59)
mount the real hook and mock only its service boundary. They complement page
tests that mock the hook itself: removing a reload, cursor guard, filter or error
transition must fail the corresponding hook assertion. Deferred promises make
pending states reproducible without real delays or network access.

`monthlyEventsPage.test.jsx` also supplies the financial goals hook mounted by
the shared page. A regression assertion refuses real XMLHttpRequest sends when
rendering this page; its goals hook and section retain their dedicated suites.

## Run locally or in an isolated cloud checkout

From the repository root:

```bash
npm ci
npm run format
npm run lint
npm run test:api-response
npm run test:api-thunk
npm run test:rav
npm run test:refresh-token
npm run type-check
npm test
npm run build
```

`type-check` currently aliases `vite build`; it is not a standalone TypeScript
check of the JavaScript Web application. Web CI runs the same sequence. When
working from the parent workspace, use its documented Docker service instead;
GitHub Actions and Codex Cloud may execute these commands directly as allowed by
`AGENTS.md`.

Run the new hook suites alone:

```bash
npx vitest run test/vitest/useOneOffOperations.test.jsx test/vitest/useMonthlyEvents.test.jsx test/vitest/useBudgetCalendar.test.jsx
npx prettier --check test/vitest/useOneOffOperations.test.jsx test/vitest/useMonthlyEvents.test.jsx test/vitest/useBudgetCalendar.test.jsx docs/testing-strategy.md
```

Expected result: all assertions pass with exit code `0`. If a test fails, run the
individual file and inspect the expected state, mock fixture and service call.
Reset service mocks between cases and settle deferred promises before cleanup.
Do not hide failures with arbitrary sleeps, retries or snapshots of internals.

## Limits and next validation layers

- jsdom does not validate layout, touch behavior, browser storage policy or
  native Android/iOS behavior.
- Web unit tests do not validate a real database, API deployment or email
  delivery. Backend contracts and real cross-layer behavior need their own tests.
- `npm run test:e2e` runs the separate Playwright suite. The isolated full-stack
  journeys run with `npm run test:e2e:stack`; see the
  [isolated stack guide](web-e2e-stack.md) delivered by #60.
- The [accessibility checks](web-accessibility.md) and
  [visual comparisons](web-visual-regression.md) complement unit tests. Native
  integration tests [#57](https://github.com/open-repos/cda-my-happy-wallet-frontend/issues/57)
  remain separate work; passing Web tests does not close them.

## Runtime compatibility and rollback

[The runtime dependency guide](web-runtime-dependencies.md) records the React 18,
Router 7 and Axios compatibility boundaries and the production dependency audit.
The new router tests cover mixed separators and rejected external navigation;
Axios adapter tests exercise real headers and the existing session interceptor.

Revert the affected PR and run the full validation contract before delivery.
Testing-only commits require no data migration. Runtime updates may restore
known advisory exposure when reverted; keep that rollback temporary and retain
the audit evidence. Production deployment is a separate manual operation.
