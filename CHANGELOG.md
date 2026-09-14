# Changelog

All notable changes to the frontend are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

[Unreleased]: https://acperso.gitlab.com/formation-cda1/projet-chef-oeuvre-rapport/projet-00-myhappywallet-frontend/-/compare/v1.0.0...develop
[1.0.0]: https://acperso.gitlab.com/formation-cda1/projet-chef-oeuvre-rapport/projet-00-myhappywallet-frontend/-/commits/v1.0.0
