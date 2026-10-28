# Changelog

All notable changes to the frontend are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.10.0] - 2026-10-28

### Added

- Added monthly and yearly envelope cards, explicit payment reconciliation and category spending trends, with dated edits to fixed expenses and income (#314).

## [1.9.0] - 2026-10-27

### Changed

- Read complete month collections and persisted occurrence links to project calendar markers and common day details without changing financial calculations (#293).
- Native calendar now reads complete month collections, displays simultaneous type indicators with a shared legend, and opens common day details with linked occurrence decisions and existing operation forms. Potential visibility is independent of financial simulation (#294).
- Shared sage action buttons, compact forms and a reserved quick-add area clarified actions in both themes without covering financial content (#296).

### Fixed

- Kept event field labels, errors and budget-impact radios local to their form instance (#312).

## [1.8.0] - 2026-10-26

### Changed

- Native shared action buttons now distinguish deletion with existing icons and themed danger styling. Floating add buttons gain a contrasting border and platform shadows; existing confirmations preserve cancellation focus (#297).

### Fixed

- Added a shared icon-capable category selector for operation, conversion and fixed-budget forms (#290).
- Displayed existing personal category icons and fallbacks in shared native form choices with system theme colors (#291).
- Kept expanded savings tables inside their scroll region instead of widening the page (#301).

## [1.7.0] - 2026-10-25

### Added

- Added server-owned savings trajectory comparisons, reversible variable-expense assumptions and safety margin, coherent allocation details and accessible monthly alternatives (#284).

### Changed

- Displayed declared savings in a rounded gauge and added a selected-goal trajectory with the server estimate and monthly text alternatives (#282).

## [1.6.0] - 2026-10-24

### Added

- Added contextual quick creation on phone using existing native operation and event forms, with separate potential events and acknowledged writes (#274).

### Changed

- Unified compact operation lists with explicit inline editing, bounded date fields and shared calendar/mobile quick creation while preserving real and simulated budgets (#273).

## [1.5.0] - 2026-10-24

### Added

- Added personal category selection, icons and sorting to fixed expenses and income, preserving assignments and drafts when category loading or saving fails (#266).

### Changed

- Unified fixed expenses and income in a sortable responsive overview with shared entry, editing and deletion controls, preserved drafts and server budget summaries (#265).

### Fixed

- Preserved the existing shared form stylesheet when replacing the fixed-operation components, preventing unrelated pages from changing their controls and table spacing (#265).

## [1.4.0] - 2026-10-23

### Changed

- Replaced the update card with a dismissible floating notification that returns when the application is reopened while an update remains pending (#255).

### Fixed

- Fixed sidebar labels wrapping beyond the navigation panel on small screens and translated the home link (#257).
- Fixed savings summaries and goal cards overflowing narrow viewports with enlarged text (#261).

## [1.3.0] - 2026-10-22

### Added

- Added the upcoming months forecast to the mobile app, opened from the dashboard and the calendar: month-end balance and allowances per month, week and day, with negative months flagged by text (#214).
- Added an analytics screen to the mobile app: expenses, income or net balance by category, month, week or day over preset periods, with a chart and an equivalent text list using the dashboard category colours (#215).
- Added weekly, quarterly and yearly repetitions to the mobile event form; the end date picker no longer offers days before the start date (#216).
- Added the savings capacity to the mobile dashboard and objectives tab: planned and required contributions, balances and allowances after goals, sustainability indicator and per-goal effort, with an "adjust contribution" shortcut to the goal form (#217).
- Added monthly events to the mobile app: list, create, edit and delete them from the objectives tab, with the Web validations; the calendar refreshes its summary and pending occurrences when it regains focus (#225).
- Added financial goals to the mobile app: list them with their progress and backend forecast, and create, edit or delete them from the objectives tab with the Web validations (#226).
- Added periodic fixed charges with an adjustable personal share, monthly previews and edit/delete controls (#238).
- Added the Simulation switch to the mobile calendar, upcoming months and savings capacity: budget reads include potential items when it is on, and a comparison shows the usual and simulated month-end balance (#240).
- Added potential items management to the mobile Simulation: list with expiry date, add and edit with the event form, confirm, delete and clear with explicit confirmation; every affected figure refreshes after a change (#241).

### Fixed

- Verified gzip compression and immutable caching for the public category icon catalogue after the owner updated Nginx (#153).
- Stopped repeated loading announcements when refreshing already displayed Web lists, forecasts and home sections, while preserving first-load, new-view and error announcements (#221).

### Security

- Updated the Web development server to Vite 6.4.5 to preserve file access restrictions on imports with query parameters (#246).

## [1.2.0] - 2026-10-21

### Added

- Added explicit budget simulation across forecasts and savings capacity, with potential event management, confirmation and automatic expiry information (#130).
- Added weekly, quarterly and annual event choices with optional inclusive end dates and preserved the dated occurrences returned by the API (#192).
- Added a twelve-month budget forecast with an accessible chart and data table, explicit negative balances and links from the home page and calendar (#193).
- Added a savings capacity summary with backend sustainability explanations, monthly/weekly/daily allowances and direct goal editing (#194).

### Fixed

- Corrected unavailable icon descriptions and search result counts in the Web and mobile category icon pickers (#152).
- Fixed truncated mobile tab bar labels with large system font sizes: labels now scale up to 1.3 and shrink to fit on one line (#155).
- Fixed screen-reader announcements on the calendar, objectives and simulation sections: refreshing data that is already displayed (after a change, a simulation update or a return to the tab) now announces only its outcome, and the spinner and Analyses states use always-mounted live regions (#171).

### Security

- Updated transitive mobile dependencies (shell-quote, js-yaml, @xmldom/xmldom, brace-expansion, source-map-js and the vite development server) to their latest compatible patch or minor versions (#205).

## [1.1.1] - 2026-10-19

### Fixed

- Kept the previous release's hashed assets available after a deployment and added an explicit rollback build that unregisters the service worker and deletes its public caches, so the PWA can be enabled in production and withdrawn safely (#185).

## [1.1.0] - 2026-10-18

### Added

- Added explicit API origin configuration for Android emulators and physical development devices (#28).
- Added regression coverage for the complete Android account and session lifecycle (#29).
- Added a responsive calendar and event manager so users can plan recurring income and expenses (#42).
- Added financial goals to the Objectives page: each goal shows an ECharts progress ring, its amounts, target date and the backend forecast (on track, behind with the required monthly contribution, missed or reached), and can be created, edited or deleted with validated fields (#44).
- Added a budget calendar with real, forecast and prudent daily amounts, an explicit carry line from the previous month, corrected balance notices, day value modes, a day filter and convert or cancel actions for planned events (#45).
- Added an accessible offline page with a retry link and no personal or financial information (#51).
- Ajouté l’identité d’installation My Happy Wallet, ses icônes adaptées aux appareils et ses métadonnées iOS, avec une langue de document française (#52).
- Added opt-in PWA update notices with explicit reload confirmation and protection for open forms (#53).
- Added an Analyses page, reachable from the sidebar and the home expense card, to chart expenses, income or net balance grouped by day, week, month, year, category or kind, optionally split by category or kind, as bars, stacked bars, lines, areas or pie, with choices kept in the URL and an accessible data table (#104).
- The mobile dashboard now shows the month's real remaining with its carry from the previous month, the forecast remaining and the prudent daily allowance, each with an explanation, instead of a total computed from fixed income and charges only (#119).
- The mobile Calendar tab now shows the monthly budget grid with markers, daily expenses or forecast values, month navigation and a day filter for the operation list, instead of a placeholder (#120).
- The mobile Calendar tab now lists planned events to handle, late ones first, and lets users convert one into an operation with adjustable values or cancel it after confirmation, with clear messages for closed months and already handled events (#121).
- Added expense bars by category and a goals progress ring to the mobile dashboard, with French text equivalents (#122).
- Added a searchable Font Awesome icon to categories on the Web, shown in the categories, operations, calendar and home charts (#131).
- Added a searchable Font Awesome icon to categories on mobile, shown in the categories, operations, calendar and expenses chart list (#132).
- Added a Categories page on the Web to create, rename, color and delete operation categories (#133).
- Added a Categories screen on mobile to create, rename, color and delete operation categories (#134).

### Changed

- Added a documented GitHub collaboration process and automated Web and mobile quality checks (#10).
- Harmonized accessible loading, empty, error, and success feedback across the mobile authentication and budget screens (#38).
- Defined one verified application version and API compatibility contract for mobile releases (#66).
- The home page now reads the monthly budget summary: Month shows the real remaining with its carry line, Week and Day show the matching share of the prudent daily allowance with an explanation, and two Apache ECharts cards chart the month's expenses by category (bars or pie) and the goals' progress, with loading, empty and error states. ECharts is loaded on demand (#99).

### Fixed

- Fixed authenticated API requests in the web application (#37).
- Amélioré la navigation au clavier, les libellés, le focus et la lisibilité des formulaires et parcours Web critiques (#58).
- Rétabli la lisibilité du tableau des opérations en thème clair en corrigeant son fond hérité et l’alignement de ses colonnes (#62).
- Displayed clear login-page guidance when an email confirmation link was already used, invalid, or expired (#86).
- Clarified accepted registration feedback without revealing whether an account already exists (#88).
- Unified registration confirmation feedback as single success or error toasts (#89).
- Shared one Web token refresh between concurrent requests and stopped sending protected requests with an expired access token when the refresh is refused, so an expired session no longer rotates the same refresh token several times or signs users out unexpectedly (#96).
- On mobile, the sidebar no longer covers protected pages: it opens as a drawer from the menu button and closes on navigation, Escape or a tap outside (#106).
- The carry, month result and real remaining labels of the budget breakdown are readable again on the home page and in the calendar, in both themes (#108).
- Page titles, eyebrows, subtitles and month navigation placed on the green shell are readable in both themes, using new text-on-shell design tokens (#110).
- The keyboard focus ring of controls placed on the green shell (menu button, header add buttons, calendar month navigation) is clearly visible in both themes (#112).
- The keyboard focus ring of the sidebar links is clearly visible in both themes (#115).
- The sidebar profile panel and logout can be used with the keyboard: named buttons open the profile and log out, with a visible focus ring (#117).
- Fixed mobile screens and operation forms so their content no longer slides under the Android status bar, and removed the extra bottom gap above the tab bar (#147).
- Fixed mobile radio options so screen readers announce which operation type, category, calendar mode or fixed budget type is selected (#148).
- Fixed the Web navigation on short screens so its links no longer slide under the profile button (#150).
- Fixed Web pages so screen readers reliably announce success and error messages after an action (#151).
- Fixed Web pages and home blocks so screen readers reliably announce when content is loading or fails to load (#164).
- Fixed the expense charts on the home page, analytics and mobile dashboard so each category keeps its own distinct color, mobile labels no longer leave an empty band, and mobile charts stay visible while they refresh (#172).

### Security

- Mis à jour les dépendances Web vulnérables et leur socle compatible pour sécuriser la navigation et les échanges HTTP (#64).

## [1.0.0] - 2026-07-19

### Added

- Responsive layouts for authentication and protected application pages.
- Reusable protected layout and hooks for fixed operations and remaining income.
- Unit and component coverage with Vitest and Testing Library.
- Responsive and public-navigation end-to-end coverage with Playwright.
- Docker-based local development stack with configurable API endpoint.
- GitLab pipelines for formatting, linting, tests, type checking and builds.
- Atomic production releases identified by commit SHA with automatic rollback.

### Changed

- Migrated the frontend toolchain to Node.js 22, Vite 6 and Vitest 4.
- Centralized API response mapping and structured application errors.
- Isolated refresh-token handling from the Axios interceptor.
- Centralized sidebar spacing and responsive scrolling behavior.
- Restricted production deployment to a manual job from protected `main`.

### Fixed

- Preserved registration form values during asynchronous state updates.
- Propagated backend validation errors instead of displaying misleading fallbacks.
- Corrected revenue API error handling.
- Allowed validation jobs to run independently from the production runner.

### Security

- Removed sensitive frontend logs.
- Replaced dynamic SSH host discovery with a pre-verified `known_hosts` file.
- Isolated SSH credentials from validation and build jobs.

[Unreleased]: https://gitlab.com/formation-cda1/projet-chef-oeuvre-rapport/projet-00-myhappywallet-frontend/-/compare/v1.10.0...develop
[1.10.0]: https://gitlab.com/formation-cda1/projet-chef-oeuvre-rapport/projet-00-myhappywallet-frontend/-/compare/v1.9.0...v1.10.0
[1.9.0]: https://gitlab.com/formation-cda1/projet-chef-oeuvre-rapport/projet-00-myhappywallet-frontend/-/compare/v1.8.0...v1.9.0
[1.8.0]: https://gitlab.com/formation-cda1/projet-chef-oeuvre-rapport/projet-00-myhappywallet-frontend/-/compare/v1.7.0...v1.8.0
[1.7.0]: https://gitlab.com/formation-cda1/projet-chef-oeuvre-rapport/projet-00-myhappywallet-frontend/-/compare/v1.6.0...v1.7.0
[1.6.0]: https://gitlab.com/formation-cda1/projet-chef-oeuvre-rapport/projet-00-myhappywallet-frontend/-/compare/v1.5.0...v1.6.0
[1.5.0]: https://gitlab.com/formation-cda1/projet-chef-oeuvre-rapport/projet-00-myhappywallet-frontend/-/compare/v1.4.0...v1.5.0
[1.4.0]: https://gitlab.com/formation-cda1/projet-chef-oeuvre-rapport/projet-00-myhappywallet-frontend/-/compare/v1.3.0...v1.4.0
[1.3.0]: https://gitlab.com/formation-cda1/projet-chef-oeuvre-rapport/projet-00-myhappywallet-frontend/-/compare/v1.2.0...v1.3.0
[1.2.0]: https://gitlab.com/formation-cda1/projet-chef-oeuvre-rapport/projet-00-myhappywallet-frontend/-/compare/v1.1.1...v1.2.0
[1.1.1]: https://gitlab.com/formation-cda1/projet-chef-oeuvre-rapport/projet-00-myhappywallet-frontend/-/compare/v1.1.0...v1.1.1
[1.1.0]: https://gitlab.com/formation-cda1/projet-chef-oeuvre-rapport/projet-00-myhappywallet-frontend/-/compare/v1.0.0...v1.1.0
[1.0.0]: https://gitlab.com/formation-cda1/projet-chef-oeuvre-rapport/projet-00-myhappywallet-frontend/-/commits/v1.0.0
