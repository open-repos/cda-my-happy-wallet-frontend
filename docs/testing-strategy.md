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

## Adoption Sequence

1. Upgrade the frontend Docker runtime and Vite in a dedicated task.
2. Install a maintained Vitest version compatible with that toolchain.
3. Add a DOM environment and the React 17-compatible Testing Library release.
4. Migrate the existing Node tests without removing their behavioral coverage.
5. Add component, hook, navigation, form, and responsive tests incrementally.

## References

- Vitest guide: https://vitest.dev/guide/
- npm package metadata checked for `vitest@0.12.10`.
