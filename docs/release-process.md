# Release process

A release moves the integrated work of `develop` to `main`, records it in
`CHANGELOG.md`, tags it and publishes its notes. Production deployment stays a
manual GitLab action.

## Owner gates

1. Merging the release pull request into `main`.
2. Approving the workflows on the post-release sync pull request, waiting for
   every configured quality check to pass, then reviewing and merging it into
   `develop`.
3. Starting `deploy_production` in the GitLab `main` pipeline.

Everything else is automated or can be prepared by an agent.

## Version rules

`npm run release:prepare` reads `changes/unreleased/*.md` and selects the
smallest version allowed by the fragments:

| Fragment types present             | Release |
| ---------------------------------- | ------- |
| `removed`                          | major   |
| `added`, `changed` or `deprecated` | minor   |
| only `fixed` and `security`        | patch   |

`--bump major|minor|patch` or `--version x.y.z` selects a larger version. A
smaller one is refused.

The script also moves the `[Unreleased]` comparison link at the end of
`CHANGELOG.md` to the new version and adds the link of the new release. It
versions the Web application only: `mobile/package.json` keeps its own version
for store releases.

## Prepare the release pull request

From an up-to-date `develop`:

```bash
git switch -c release/x.y.z origin/develop
npm run release:prepare -- --dry-run   # preview version and notes
npm run release:prepare                # write CHANGELOG.md and changes/releases/x.y.z.md, bump version, remove fragments
git add CHANGELOG.md package.json package-lock.json changes
git commit -m "chore(release): x.y.z"
git push -u origin release/x.y.z
gh pr create --base main --head release/x.y.z --title "release: x.y.z" \
  --body "$(npm run --silent release:notes -- x.y.z)"
```

Agents run the `npm` commands in their Docker container. The pull request must
pass `Web quality` and receive the owner's review. Name every backend release
the pull request depends on.

## After the merge

The `publish-release` workflow runs on the push to `main`. When the version in
`package.json` changed, it:

1. creates the annotated tag `vx.y.z` on GitHub;
2. publishes the GitHub release with the release notes;
3. pushes the tag to GitLab, where the `gitlab_release` job publishes the
   same notes as a GitLab release;
4. opens (or reuses) a pull request from `main` back into `develop`, so the
   owner can bring the version and changelog into `develop` after validation.

The release notes have two parts: « Pour les utilisateurs », the French
`changes/releases/x.y.z.md` file built from the fragments' `user:` lines, then
« Détail technique », the matching `CHANGELOG.md` section. Review and edit the
French file in the release pull request: it is published as written. A tag
pipeline runs only `gitlab_release`, never the build or deployment jobs.

Each step skips what already exists, so re-running a failed job resumes it. A
GitLab or sync failure raises a warning; the job summary identifies an incomplete
sync and tells the owner to inspect `develop` and open pull requests before
retrying the publication job. A retry does not create a second open sync PR.

The `mirror-gitlab` workflow pushes `main` to GitLab, which starts the GitLab
pipeline. When it passes, the owner starts `deploy_production`, after the
backend release this frontend release depends on is deployed.

A push to `main` that keeps the same version publishes nothing, and neither
does a push whose previous commit is unknown.

## Approve and finish the post-release sync

The publication job summary links to the sync pull request and reports it as
pending, even though the release itself has already been published. The workflow
never merges the sync pull request automatically.

GitHub creates approval-required `pull_request` runs when a workflow opens a PR
with `GITHUB_TOKEN`. On that PR, a maintainer must choose **Approve workflows to
run**, wait for all configured quality checks (Web, mobile, visual and PWA), then
review and merge the PR. Do not merge while runs await approval, are missing,
have failed or have been cancelled. The merge uses the maintainer's identity,
so the normal `develop` push checks and GitLab branch mirror can run.

This behavior is documented in
[GitHub's GITHUB_TOKEN reference](https://docs.github.com/en/actions/concepts/security/github_token)
and the
[11 June 2026 announcement](https://github.blog/changelog/2026-06-11-bot-created-pull-requests-can-run-workflows-if-approved/).
Do not replace quality workflows with `pull_request_target`, add a privileged
personal token or weaken repository protections to avoid this approval.

If a sync PR was merged before approval, its runs can fail with **This workflow
run required approval but was not approved before it expired.** Those runs have
not executed any tests. An expired run may be impossible to retry. Preserve that
history, inspect the published commit's push checks, and record their results
separately. Do not rerun publication to clear old failed PR runs or republish an
existing version. If further verification is needed, create a normal follow-up
PR and run its configured checks.

## Repository settings

- **Settings → Actions → General → Allow GitHub Actions to create and approve
  pull requests** must be enabled for step 4. Without it, open the sync pull
  request manually as the warning explains.
- `main` must stay the default branch: GitHub never deletes the default branch
  after the sync pull request merges, even with automatic branch deletion.
- Keep the post-release sync PR open until its workflows are approved and all
  configured quality checks pass. Its owner-performed merge triggers the normal
  `develop` validation and mirror workflows.
