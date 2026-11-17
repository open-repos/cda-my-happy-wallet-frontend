---
type: security
issue: 432
---

Removed the unused `styled-components` runtime dependency, which pulled `picomatch` (GHSA-fc5q-39xc-vjpf, no patched release) into the production tree through `babel-plugin-styled-components`.
