# Agent instructions

These instructions apply to the whole frontend repository.

## Workflow

- Use GitHub Issues and pull requests to describe and review development work.
- Start work from `develop` on a dedicated `feature/*`, `fix/*`, or `refactor/*` branch.
- Open pull requests against `develop`. Keep `main` reserved for tested releases.
- Do not push directly to `develop` or `main`.
- An agent may push its working branch and open or update its pull request when the task authorizes repository updates.
- A trusted same-repository pull request to `develop` may opt into native auto-merge when every changed file is low risk and all required checks pass. Follow `docs/delivery-automation.md`.
- CI, dependencies, authentication, sessions, security, configuration and financial logic always require owner review.
- Do not merge a release pull request, create a tag or release, configure credentials, or trigger a deployment without explicit user authorization.
- Keep commits focused. Explain the behavior delivered and the reason for the change in each commit message.

## Planning and Issue selection

- Use the organization Project `open-repos/2` (`My Happy Wallet Roadmap`) as the cross-repository planning view. Its `Workflow`, `Priority`, `Effort`, `Kind`, `Milestone`, and `Repository` fields define ordering and progress.
- GitHub Issues are the source of truth for the executable specification and current work status. GitLab links in migrated Issues are historical references.
- The selected Issue and its dependency links remain authoritative for implementation. Project fields organize work but do not override the Issue scope or acceptance criteria.
- Read the complete Issue selected by the task before editing code. Its acceptance criteria, scope, dependencies, milestone, priority and effort apply to the implementation.
- Never implement an Issue labelled `kind/parent`. It groups executable child Issues.
- Start only an open Issue labelled `status/ready`, unless the user explicitly selects another Issue. Confirm that every Issue listed under its dependencies is closed.
- Use one lifecycle label at a time: `status/backlog`, `status/blocked`, `status/ready`, `status/in-progress`, `status/in-review`, or `status/done`.
- When GitHub write access is available, replace `status/ready` with `status/in-progress` when work starts and with `status/in-review` when the pull request opens. The merge workflow closes the primary Issue and applies `status/done`.
- In explicitly authorized batch mode, finish and validate one Issue and open its pull request before selecting the next eligible `status/ready` Issue. Use one branch and one pull request per Issue.
- When selecting work autonomously, prefer a `Ready` task from an already started milestone that is closest to completion. Re-read the Project and linked dependencies after each completed Issue.
- This repository is self-contained for Codex Cloud. Do not assume that the sibling local `agent-workspace` exists in a cloud checkout; use the selected GitHub Issue and this file.

## Project areas

- The repository root contains the Web application.
- `mobile/` contains the Expo mobile application.
- Keep Web and mobile changes separate when they do not depend on each other.
- Reuse existing domain, infrastructure, and presentation boundaries.

## Cross-repository features

- Represent a feature spanning frontend and backend with one planning parent and one executable child Issue in each repository. Link the child Issues and record the blocking direction in their dependency sections and in `open-repos/2`.
- Run the backend child in the backend Codex Cloud environment and the frontend child in the frontend environment. Never modify or commit the other repository from the same cloud task.
- When the frontend depends on a new API contract, complete and merge the backend contract first. The frontend may prepare typed contracts, fixtures, or mocks in parallel only when the shared contract is already explicit.
- Open one pull request per child Issue. After both are merged into `develop`, run the cross-repository integration or staging validation required by the planning parent.
- If a selected frontend Issue unexpectedly requires backend changes that are not covered by a linked Issue, stop and create or request the backend child Issue instead of widening the current pull request.

## Validation

For Web changes, run:

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

For mobile changes, run from `mobile/`:

```bash
npm ci
npm run format
npm run lint
npm run type-check
npm test
npm run doctor
npm run build:web
```

GitHub Actions and Codex Cloud may run these commands directly in their isolated checkout. Agents working from the parent `my-happy-wallet` workspace must use the Docker commands documented in the parent `agent-workspace/AGENTS.md`.

## Changes and pull requests

- Add a Markdown fragment under `changes/unreleased/` for every user-visible change. Follow `changes/README.md`.
- Link every pull request to its GitHub Issue with `Refs #<number>`. Use additional `Refs #<number>` lines for related issues that the pull request does not complete.
- GitHub only applies `Closes #<number>` automatically when a pull request reaches the default branch, currently `main`. For pull requests to `develop`, declare exactly one completed `Primary issue: Refs #<number>`; automation closes it after a successful merge and leaves related Issues open.
- Use `Closes #<number>` in a pull request only when it targets the default branch and directly completes that issue.
- Describe the result, user impact, validation performed, configuration or migration needs, and known risks in the pull request.
- Never commit credentials, tokens, production data, or populated environment files. Document new variables in an example environment file.
- Production deployment remains a manual GitLab CI action performed by the project owner.
