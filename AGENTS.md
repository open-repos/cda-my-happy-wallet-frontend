# Agent instructions

These instructions apply to the whole frontend repository.

## Workflow

- Use GitHub Issues and pull requests to describe and review development work.
- Start work from `develop` on a dedicated `feature/*`, `fix/*`, or `refactor/*` branch.
- Open pull requests against `develop`. Keep `main` reserved for tested releases.
- Do not push directly to `develop` or `main`.
- An agent may push its working branch and open or update its pull request when the task authorizes repository updates.
- Do not merge a pull request, create a tag or release, synchronize GitLab, or trigger a deployment without explicit user authorization.
- Keep commits focused. Explain the behavior delivered and the reason for the change in each commit message.

## Project areas

- The repository root contains the Web application.
- `mobile/` contains the Expo mobile application.
- Keep Web and mobile changes separate when they do not depend on each other.
- Reuse existing domain, infrastructure, and presentation boundaries.

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
- Link the pull request to its GitHub Issue with `Closes #<number>` when it completes the issue.
- Describe the result, user impact, validation performed, configuration or migration needs, and known risks in the pull request.
- Never commit credentials, tokens, production data, or populated environment files. Document new variables in an example environment file.
- Production deployment remains a manual GitLab CI action performed by the project owner.
