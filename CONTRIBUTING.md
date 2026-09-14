# Contributing

GitHub is the collaboration workspace for issues, branches, and pull requests. GitLab receives release-ready code and runs the deployment pipeline.

## Development flow

1. Create or select a GitHub Issue with a clear result and acceptance criteria.
2. Branch from the latest `develop` using `feature/<topic>`, `fix/<topic>`, or `refactor/<topic>`.
3. Implement one coherent change and keep commits focused and descriptive.
4. Add a fragment to `changes/unreleased/` when users will notice the change.
5. Run the checks listed in `AGENTS.md` for every affected application.
6. Push the topic branch and open a pull request targeting `develop`.
7. Test the result before merging. Release changes later move from `develop` to `main` through a separate pull request.

Use an imperative commit subject that identifies the delivered behavior, for example:

```text
feat(mobile): show recurring operations in the calendar
```

Use the commit body to explain relevant decisions, constraints, or migration steps. Avoid bundling unrelated features into one commit.

## Release and deployment

`develop` contains integrated work for the next version. `main` contains the release candidate accepted by the project owner.

Creating a release includes collecting the unreleased change fragments into `CHANGELOG.md`, choosing a version, merging the release pull request, and creating matching GitHub and GitLab tags. The project owner explicitly authorizes these operations.

Production is deployed manually from the GitLab pipeline after the GitLab `main` branch has been synchronized and its pipeline has passed. Agents must not trigger production deployment.
