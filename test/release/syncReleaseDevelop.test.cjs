const assert = require("node:assert/strict");
const { test } = require("node:test");
const { readFileSync } = require("node:fs");
const { syncDevelop } = require("../../scripts/sync-release-develop.cjs");

const repository = "open-repos/cda-my-happy-wallet-frontend";
const tag = "v1.6.0";
const url = `https://github.com/${repository}/pull/278`;

function scenario(responses, options = {}) {
  const calls = [];
  const run = (command, args) => {
    calls.push([command, ...args]);
    assert.notDeepEqual(args.slice(0, 2), ["pr", "merge"]);
    assert.ok(responses.length, "Unexpected command");
    const response = responses.shift();
    if (response instanceof Error) throw response;
    return response;
  };
  return {
    calls,
    execute: () => syncDevelop({ repository, tag, run, ...options }),
  };
}

test("already-synced develop makes no GitHub mutation", () => {
  const s = scenario(["", "0"]);
  assert.match(s.execute(), /contient déjà/);
  assert.deepEqual(s.calls, [
    ["git", "fetch", "origin", "develop"],
    ["git", "rev-list", "--count", "origin/develop..HEAD"],
  ]);
});

test("creates a sync PR and leaves approval, checks and merge to the maintainer", () => {
  const s = scenario(["", "3", "[]", url]);
  const summary = s.execute();
  assert.match(summary, /en attente/);
  assert.ok(summary.includes(url));
  assert.match(summary, /Approuver les workflows/);
  assert.match(summary, /Attendre la réussite de tous les contrôles/);
  assert.match(summary, /Relire et fusionner/);
  assert.equal(s.calls.length, 4);
  assert.deepEqual(s.calls[2], [
    "gh",
    "pr",
    "list",
    "--repo",
    repository,
    "--base",
    "develop",
    "--head",
    "main",
    "--state",
    "open",
    "--json",
    "url",
  ]);
  const create = s.calls[3];
  assert.deepEqual(create.slice(0, 3), ["gh", "pr", "create"]);
  assert.match(create[create.indexOf("--body") + 1], /intentionally left open/);
  assert.ok(create.includes("develop"));
  assert.ok(create.includes("main"));
});

test("reuses an open PR on retry without recreating, editing or merging it", () => {
  const s = scenario(["", "3", JSON.stringify([{ url }])]);
  assert.ok(s.execute().includes(url));
  assert.equal(s.calls.length, 3);
});

test("lookup errors or invalid responses never lead to PR creation", () => {
  for (const response of [
    new Error("unavailable"),
    "invalid",
    "{}",
    "null",
    JSON.stringify([{ url }, { url }]),
    JSON.stringify([{}]),
    JSON.stringify([{ url: "https://example.test/pull/278" }]),
  ]) {
    const s = scenario(["", "3", response]);
    assert.throws(s.execute);
    assert.equal(s.calls.length, 3);
  }
});

test("creation failure stops; a later attempt looks up an acknowledged PR", () => {
  const s = scenario(["", "3", "[]", new Error("response lost")]);
  assert.throws(s.execute, /response lost/);
  assert.equal(s.calls.length, 4);
  const retry = scenario(["", "3", JSON.stringify([{ url }])]);
  assert.ok(retry.execute().includes(url));
  assert.equal(retry.calls.length, 3);
});

test("Git failures and invalid counts stop before querying GitHub", () => {
  for (const response of [
    new Error("fetch failed"),
    new Error("rev-list failed"),
    "",
  ]) {
    const s =
      response.message === "fetch failed"
        ? scenario([response])
        : scenario(["", response]);
    assert.throws(s.execute);
    assert.ok(s.calls.every(([command]) => command === "git"));
  }
});

test("invalid configuration fails before executing any commands", () => {
  for (const options of [
    { tag: undefined },
    { tag: "v1.6.0;echo unsafe" },
    { repository: undefined },
    { repository: "invalid" },
  ]) {
    const s = scenario([], options);
    assert.throws(s.execute);
    assert.equal(s.calls.length, 0);
  }
});

test("publish workflow calls the tested sync script without an inline merge", () => {
  const workflow = readFileSync(
    require.resolve("../../.github/workflows/publish-release.yml"),
    "utf8"
  );
  assert.match(workflow, /run: node scripts\/sync-release-develop\.cjs/);
  assert.doesNotMatch(workflow, /gh pr merge/);
});
