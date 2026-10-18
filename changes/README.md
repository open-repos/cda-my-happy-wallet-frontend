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

## User line

Add an optional `user:` line in French when people using the Web application will notice the change. Write one plain sentence without technical terms, addressed to the user:

```markdown
---
type: added
issue: 104
user: Nouvelle page Analyses pour visualiser vos dépenses et revenus en graphiques.
---

Added an Analyses page to chart expenses, income or net balance.
```

The release collects these lines into `changes/releases/<version>.md`, published as the « Pour les utilisateurs » part of the GitHub and GitLab releases. Omit the line for internal, tooling or dependency changes, and for native mobile changes, which reach users through store releases.

Documentation, tests, refactoring, and delivery-only changes may omit a fragment when they do not change user-visible behavior. State that choice in the pull request checklist.
