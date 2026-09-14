# Unreleased change fragments

Add one Markdown file for each user-visible pull request. Name it `<issue>-<short-topic>.md`, for example `42-calendar-filters.md`.

Use this format:

```markdown
---
type: added
issue: 42
---

Added calendar filters so users can focus on selected operation types.
```

Allowed types follow Keep a Changelog: `added`, `changed`, `deprecated`, `removed`, `fixed`, and `security`.

Write one concise sentence in past tense from the user's point of view. A release pull request collects these entries under the matching version in `CHANGELOG.md`, then removes the collected fragment files.

Documentation, tests, refactoring, and delivery-only changes may omit a fragment when they do not change user-visible behavior. State that choice in the pull request checklist.
