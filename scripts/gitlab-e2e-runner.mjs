import { execFileSync } from "node:child_process";
import {
  closeSync,
  constants,
  fstatSync,
  openSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const PROJECT_FILE = ".mhw-e2e-project.env";
const projectPattern = /^mhw-e2e-[a-f0-9]{12}$/;
const deploymentVariables = [
  "SSH_PRIVATE_KEY",
  "SSH_KNOWN_HOSTS",
  "SSH_AUTH_SOCK",
  "SERVER_IP",
  "SERVER_USER",
  "DEPLOY_PATH",
  "DATABASE_URL",
  "SHADOW_DATABASE_URL",
];

export function assertRunner({
  nodeMajor,
  securityOptions,
  composeVersion,
  env = {},
}) {
  if (nodeMajor !== 22) throw new Error("E2E runner requires Node 22.");
  if (deploymentVariables.some((name) => env[name]))
    throw new Error(
      "E2E runner must not inherit production or SSH configuration."
    );
  if (
    !Array.isArray(securityOptions) ||
    !securityOptions.some(
      (option) => option === "name=rootless" || option === "rootless"
    )
  )
    throw new Error(
      "E2E runner requires rootless Docker on a dedicated disposable runner."
    );
  const version = /^v?(\d+)\.(\d+)\.(\d+)(?:[-+].*)?$/.exec(
    composeVersion.trim()
  );
  if (!version || Number(version[1]) !== 2 || Number(version[2]) < 24)
    throw new Error(
      "E2E runner requires Docker Compose v2.24 or newer within v2."
    );
}

export function writeProjectFile(directory, project) {
  if (!projectPattern.test(project))
    throw new Error("Invalid disposable E2E project.");
  // Exclusive creation refuses stale metadata and symbolic links.
  writeFileSync(resolve(directory, PROJECT_FILE), `project=${project}\n`, {
    flag: "wx",
    mode: 0o600,
  });
}

export function readProjectFile(directory) {
  const path = resolve(directory, PROJECT_FILE);
  let file;
  try {
    file = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW);
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
  try {
    const info = fstatSync(file);
    if (!info.isFile() || info.size > 64 || (info.mode & 0o077) !== 0)
      throw new Error("Invalid E2E project metadata file.");
    const project = /^project=(mhw-e2e-[a-f0-9]{12})\n$/.exec(
      readFileSync(file, "utf8")
    )?.[1];
    if (!project) throw new Error("Invalid disposable E2E project metadata.");
    return project;
  } finally {
    closeSync(file);
  }
}

export function cleanupProject(project, run) {
  if (!projectPattern.test(project))
    throw new Error("Invalid disposable E2E project.");
  for (const [kind, list, remove] of [
    ["containers", ["ps", "--all", "--quiet"], ["rm", "--force"]],
    ["networks", ["network", "ls", "--quiet"], ["network", "rm"]],
  ]) {
    const ids = run([
      ...list,
      "--filter",
      `label=com.docker.compose.project=${project}`,
    ])
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    if (ids.some((id) => !/^[a-f0-9]{12,64}$/.test(id)))
      throw new Error(`Invalid E2E ${kind} identifiers.`);
    if (ids.length) run([...remove, ...ids]);
  }
}

const docker = (args) =>
  execFileSync("docker", args, {
    encoding: "utf8",
    timeout: 30_000,
    stdio: ["ignore", "pipe", "pipe"],
  });
function check() {
  assertRunner({
    nodeMajor: Number(process.versions.node.split(".")[0]),
    env: process.env,
    securityOptions: JSON.parse(
      docker(["info", "--format", "{{json .SecurityOptions}}"])
    ),
    composeVersion: docker(["compose", "version", "--short"]),
  });
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    const directory = fileURLToPath(new URL("../", import.meta.url));
    if (process.argv[2] === "check") {
      check();
      console.log("Dedicated rootless E2E runner checks passed.");
    } else if (process.argv[2] === "cleanup") {
      const project = readProjectFile(directory);
      if (project) {
        check();
        cleanupProject(project, docker);
        unlinkSync(resolve(directory, PROJECT_FILE));
      }
      console.log("Disposable E2E cleanup completed.");
    } else throw new Error("Use check or cleanup.");
  } catch {
    // Docker errors can include private daemon/proxy settings; do not dump them.
    console.error(
      "E2E runner check/cleanup refused or failed. See docs/gitlab-e2e.md."
    );
    process.exitCode = 1;
  }
}
