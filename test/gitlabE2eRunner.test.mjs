import assert from "node:assert/strict";
import {
  chmodSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { load } from "js-yaml";
import {
  PROJECT_FILE,
  assertRunner,
  cleanupProject,
  readProjectFile,
  writeProjectFile,
} from "../scripts/gitlab-e2e-runner.mjs";

const project = "mhw-e2e-012345abcdef";
const runner = {
  nodeMajor: 22,
  securityOptions: ["name=seccomp", "name=rootless"],
  composeVersion: "v2.40.1",
  env: {},
};
test("accepts only the dedicated rootless runner contract", () => {
  assert.doesNotThrow(() => assertRunner(runner));
  for (const change of [
    { nodeMajor: 24 },
    { nodeMajor: 20 },
    { securityOptions: ["name=seccomp"] },
    { securityOptions: null },
    { securityOptions: ["not-rootless"] },
    { composeVersion: "2.23.9" },
    { composeVersion: "1.29.0" },
    { composeVersion: "unavailable" },
  ])
    assert.throws(() => assertRunner({ ...runner, ...change }));
});
test("refuses production and SSH configuration without exposing its values", () => {
  for (const name of [
    "SSH_PRIVATE_KEY",
    "SSH_KNOWN_HOSTS",
    "SSH_AUTH_SOCK",
    "SERVER_IP",
    "SERVER_USER",
    "DEPLOY_PATH",
    "DATABASE_URL",
    "SHADOW_DATABASE_URL",
  ]) {
    assert.throws(
      () =>
        assertRunner({ ...runner, env: { [name]: "synthetic-private-value" } }),
      (error) => !error.message.includes("synthetic-private-value")
    );
  }
});
test("recovery metadata contains only a validated project name and is exclusive", () => {
  const directory = mkdtempSync(join(tmpdir(), "mhw-runner-test-"));
  try {
    assert.equal(readProjectFile(directory), null);
    assert.throws(() => writeProjectFile(directory, "production"));
    writeProjectFile(directory, project);
    assert.equal(readProjectFile(directory), project);
    assert.equal(statSync(join(directory, PROJECT_FILE)).mode & 0o777, 0o600);
    assert.throws(() => writeProjectFile(directory, project));
    writeFileSync(
      join(directory, PROJECT_FILE),
      `project=${project}\ncommand=unexpected\n`
    );
    assert.throws(() => readProjectFile(directory));
    writeFileSync(join(directory, PROJECT_FILE), "x".repeat(128));
    assert.throws(() => readProjectFile(directory));
    writeFileSync(join(directory, PROJECT_FILE), `project=${project}\n`);
    chmodSync(join(directory, PROJECT_FILE), 0o644);
    assert.throws(() => readProjectFile(directory));
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
test("refuses a symbolic-link metadata file without changing its target", () => {
  const directory = mkdtempSync(join(tmpdir(), "mhw-runner-test-"));
  try {
    const target = join(directory, "untouched");
    writeFileSync(target, "synthetic original");
    symlinkSync(target, join(directory, PROJECT_FILE));
    assert.throws(() => writeProjectFile(directory, project));
    assert.throws(() => readProjectFile(directory));
    assert.equal(readFileSync(target, "utf8"), "synthetic original");
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
test("cleanup selects only this exact project, removes containers before networks and repeats harmlessly", () => {
  const commands = [];
  const responses = [
    "a".repeat(12) + "\n",
    "",
    "b".repeat(12) + "\n",
    "",
    "",
    "",
  ];
  const run = (command) => {
    commands.push(command);
    return responses.shift();
  };
  cleanupProject(project, run);
  cleanupProject(project, run);
  assert.deepEqual(commands, [
    [
      "ps",
      "--all",
      "--quiet",
      "--filter",
      `label=com.docker.compose.project=${project}`,
    ],
    ["rm", "--force", "a".repeat(12)],
    [
      "network",
      "ls",
      "--quiet",
      "--filter",
      `label=com.docker.compose.project=${project}`,
    ],
    ["network", "rm", "b".repeat(12)],
    [
      "ps",
      "--all",
      "--quiet",
      "--filter",
      `label=com.docker.compose.project=${project}`,
    ],
    [
      "network",
      "ls",
      "--quiet",
      "--filter",
      `label=com.docker.compose.project=${project}`,
    ],
  ]);
});
test("cleanup refuses invalid scope, invalid identifiers and propagates daemon failure", () => {
  assert.throws(() =>
    cleanupProject("production", () => assert.fail("No Docker command allowed"))
  );
  assert.throws(() =>
    cleanupProject(project, () => "unexpected-container-name")
  );
  assert.throws(() =>
    cleanupProject(project, () => {
      throw new Error("synthetic daemon failure");
    })
  );
});
test("the optional job has no production runner, deployment environment, services or artifact inheritance", () => {
  const ci = load(
    readFileSync(new URL("../.gitlab-ci.yml", import.meta.url), "utf8")
  );
  const job = ci.e2e_optional;
  assert.equal(job.allow_failure, true);
  assert.equal(job.interruptible, true);
  assert.deepEqual(job.tags, ["mhw-e2e-rootless"]);
  assert.deepEqual(job.cache, []);
  assert.equal(job.dependencies, undefined);
  assert.ok(job.needs.every((need) => need.artifacts === false));
  assert.equal(job.variables.RUNNER_SCRIPT_TIMEOUT, "20m");
  assert.equal(job.variables.RUNNER_AFTER_SCRIPT_TIMEOUT, "4m");
  assert.equal(job.environment, undefined);
  assert.equal(job.services, undefined);
  assert.equal(job.rules.at(-1).when, "never");
  assert.ok(job.rules.slice(0, -1).every((rule) => rule.when === "manual"));
  assert.ok(
    job.rules[0].if.includes(
      "$CI_MERGE_REQUEST_SOURCE_PROJECT_ID == $CI_PROJECT_ID"
    )
  );
  assert.equal(
    job.before_script[0],
    "node scripts/gitlab-e2e-runner.mjs check"
  );
  assert.deepEqual(job.after_script, [
    "node scripts/gitlab-e2e-runner.mjs cleanup",
  ]);
  assert.deepEqual(ci.deploy_production.tags, ["server_runner_2"]);
  assert.ok(
    !ci.deploy_production.needs.some((need) => need.job === "e2e_optional")
  );
});
