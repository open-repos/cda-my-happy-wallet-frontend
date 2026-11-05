---
type: added
issue: 360
---

Added the shared `FilterCombobox` field: accessible editable combobox with debounced search, cancelled stale requests, cursor-paginated suggestions loaded on scroll or with the keyboard, empty/loading/error/end states and single or multiple choice. Not wired to a screen yet (backend #165 pending); positioning is shared with `ChoiceSelect` through `useAnchoredPopup`.
