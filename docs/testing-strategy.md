# Frontend Testing Strategy

## Test Runner Decision

Vitest is the target test runner because it shares Vite's module resolution and
transformation pipeline. It must not be installed against the current toolchain.

Current constraints:

- the application uses Vite 2.8 and React 17;
- the Docker agent uses Node 16 for compatibility with the existing project;
- current Vitest requires Vite 6 or newer and Node 20 or newer;
- legacy Vitest 0.12 supports Node 14, but depends on Vite 2.9 or newer.

Installing a legacy Vitest release would add an obsolete test runner and a second
Vite version. Installing a maintained Vitest release requires a coordinated Node
and Vite migration. Until that migration is planned and validated, the existing
Node characterization tests remain the executable frontend test suite.

## Migration Matrix

| Concern | Current | Target | Compatibility reason |
| --- | --- | --- | --- |
| Frontend runtime | Node 16 | Node 22 | Supported by Vite 6, Vitest 4 and jsdom 26 |
| Bundler | Vite 2.8 | Vite 6.4 | Supported by Vitest 4.1 without adopting Vite 7/8 |
| React plugin | 1.0 | 4.7 | Supports Vite 6 |
| Test runner | Node scripts | Vitest 4.1 | Maintained runner supporting Vite 6 |
| DOM environment | none | jsdom 26 | Supports Node 22 |
| UI test helpers | none | Testing Library 12.1 | Last React 17-compatible major |

React and React DOM stay on version 17 during this migration. Upgrading React is
a separate user-facing migration and is not required to modernize the test
toolchain.

## Adoption Sequence

1. Add a dedicated Node 22 Compose service for frontend commands.
2. Upgrade Vite and its plugins, then validate the existing build and tests.
3. Install and configure Vitest with jsdom.
4. Add the React 17-compatible Testing Library release.
5. Migrate existing tests without removing behavioral coverage.
6. Add component, hook, navigation, form, and responsive tests incrementally.

## Rollback Strategy

Each adoption step is an independent commit. If a validation fails:

1. stop before committing the failing step;
2. keep the Node 16 backend service unchanged;
3. restore the frontend `package.json`, lockfile, Vite config and tests to the
   last validated frontend commit;
4. remove the dedicated frontend Compose service only if the migration is
   abandoned entirely;
5. rerun the pre-migration Node characterization tests and Vite build.

## References

- Vitest guide: https://vitest.dev/guide/
- npm package metadata checked for Vite 6.4, Vitest 4.1, React plugin 4.7,
  jsdom 26 and Testing Library 12.1.5.
