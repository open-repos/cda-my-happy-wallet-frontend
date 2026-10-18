import { randomBytes } from "node:crypto";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { appendFileSync } from "node:fs";
import { writeProjectFile } from "./gitlab-e2e-runner.mjs";

const cleanup = ["down", "--volumes", "--remove-orphans", "--timeout", "10"];

export function logSink(write, secrets) {
  let pending = "";
  const redact = (text) =>
    secrets.reduce(
      (safe, secret) => safe.split(secret).join("[REDACTED]"),
      text
    );
  return {
    chunk(data) {
      pending += data;
      const lines = pending.split("\n");
      pending = lines.pop();
      for (const line of lines) write(`${redact(line)}\n`);
    },
    end() {
      if (pending) write(redact(pending));
      pending = "";
    },
  };
}

export async function runStack(run, interrupted = () => false) {
  let result = 1;
  try {
    for (const command of [
      ["build", "--pull"],
      ["up", "--detach", "--wait", "--wait-timeout", "180", "api"],
      ["run", "--rm", "--no-deps", "tests"],
    ]) {
      if (interrupted()) return 130;
      result = await run(command);
      if (result !== 0) {
        if (command[0] === "up")
          await run(["logs", "--no-color", "--tail", "80", "api"]);
        return result;
      }
    }
    return interrupted() ? 130 : result;
  } catch {
    return 1;
  } finally {
    // Also runs on failed builds, readiness failures and interrupted tests.
    if ((await run(cleanup)) !== 0) {
      throw new Error("E2E stack cleanup failed; remove this named project.");
    }
  }
}

async function main() {
  const project = `mhw-e2e-${randomBytes(6).toString("hex")}`;
  const env = { ...process.env };
  const secrets = [];
  for (const name of [
    "E2E_DB_PASSWORD",
    "E2E_ROOT_PASSWORD",
    "E2E_PASSWORD",
    "E2E_ACCESS_SECRET",
    "E2E_REFRESH_SECRET",
    "E2E_REGISTER_SECRET",
  ]) {
    env[name] = randomBytes(32).toString("hex");
    secrets.push(env[name]);
    if (process.env.GITHUB_ACTIONS === "true")
      console.log(`::add-mask::${env[name]}`);
  }
  console.log(`Starting disposable Compose project ${project}`);
  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(process.env.GITHUB_OUTPUT, `project=${project}\n`);
  }
  const root = fileURLToPath(new URL("../", import.meta.url));
  if (process.env.GITLAB_CI === "true") writeProjectFile(root, project);
  const prefix = [
    "compose",
    "--project-name",
    project,
    "--file",
    "compose.e2e.yml",
  ];
  let active;
  let stopped = false;
  const stop = () => {
    stopped = true;
    active?.kill("SIGTERM");
  };
  const run = (args) =>
    new Promise((done) => {
      active = spawn("docker", [...prefix, ...args], {
        cwd: root,
        env,
        stdio: ["ignore", "pipe", "pipe"],
      });
      for (const [source, destination] of [
        [active.stdout, process.stdout],
        [active.stderr, process.stderr],
      ]) {
        source.setEncoding("utf8");
        const sink = logSink((text) => destination.write(text), secrets);
        source.on("data", (data) => sink.chunk(data));
        source.on("end", () => sink.end());
      }
      active.once("error", () => done(1));
      active.once("exit", (code) => done(code ?? 1));
    });
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
  try {
    process.exitCode = await runStack(run, () => stopped);
    // A second down must be harmless: prove cleanup is safe to repeat.
    if ((await run(cleanup)) !== 0) process.exitCode = 1;
  } finally {
    process.off("SIGINT", stop);
    process.off("SIGTERM", stop);
  }
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  main().catch(() => {
    console.error("E2E stack failed.");
    process.exitCode = 1;
  });
}
