import assert from "node:assert/strict";
import { test } from "node:test";
import { createRequire } from "node:module";
import { logSink, runStack } from "../scripts/run-e2e-stack.mjs";

test("redacts secrets split across streamed log chunks and the final line", () => {
  let output = "";
  const sink = logSink(
    (text) => {
      output += text;
    },
    ["synthetic-secret"]
  );
  sink.chunk("prefix synthetic-");
  sink.chunk("secret\nlast synthetic-secret");
  sink.end();
  assert.equal(output, "prefix [REDACTED]\nlast [REDACTED]");
});

const { assertTestDatabase } = createRequire(import.meta.url)(
  "./full-stack/seed.cjs"
);
const environment = {
  NODE_ENV: "test",
  MHW_E2E: "1",
  E2E_PASSWORD: "a".repeat(64),
  DATABASE_URL: "mysql://mhw_e2e:synthetic@mysql:3306/mhw_e2e",
};

test("fixture guard accepts only the dedicated test environment", () => {
  assert.doesNotThrow(() => assertTestDatabase(environment));
  for (const change of [
    { NODE_ENV: "production" },
    { MHW_E2E: "0" },
    { E2E_PASSWORD: "" },
    { DATABASE_URL: "mysql://mhw_e2e:x@localhost:3306/mhw_e2e" },
    { DATABASE_URL: "mysql://mhw_e2e:x@mysql:3306/myhappywallet" },
    { DATABASE_URL: "mysql://root:x@mysql:3306/mhw_e2e" },
    { DATABASE_URL: "mysql://mhw_e2e:x@mysql:3307/mhw_e2e" },
    { DATABASE_URL: "mysql://mhw_e2e:x@mysql:3306/mhw_e2e?schema=production" },
    { DATABASE_URL: "not a database URL" },
  ])
    assert.throws(
      () => assertTestDatabase({ ...environment, ...change }),
      /E2E fixtures/
    );
});

test("runs build, health gates, browser tests and scoped cleanup in order", async () => {
  const calls = [];
  const result = await runStack(async (args) => {
    calls.push(args);
    return 0;
  });
  assert.equal(result, 0);
  assert.deepEqual(
    calls.map((args) => args[0]),
    ["build", "up", "run", "down"]
  );
  assert.ok(calls[1].includes("--wait"));
  assert.ok(calls[3].includes("--volumes"));
});

for (const failingStep of ["build", "up", "run"]) {
  test(`preserves ${failingStep} failure and still cleans up`, async () => {
    const calls = [];
    const result = await runStack(async (args) => {
      calls.push(args[0]);
      return args[0] === failingStep ? 7 : 0;
    });
    assert.equal(result, 7);
    assert.equal(calls.at(-1), "down");
    if (failingStep !== "run") assert.ok(!calls.includes("run"));
  });
}

test("cleans up after a process error", async () => {
  const calls = [];
  assert.equal(
    await runStack(async (args) => {
      calls.push(args[0]);
      if (args[0] === "build") throw new Error("process failed");
      return 0;
    }),
    1
  );
  assert.deepEqual(calls, ["build", "down"]);
});

test("interruption skips startup and still cleans up", async () => {
  const calls = [];
  assert.equal(
    await runStack(
      async (args) => {
        calls.push(args[0]);
        return 0;
      },
      () => true
    ),
    130
  );
  assert.deepEqual(calls, ["down"]);
});

test("cleanup failure is never reported as a successful run", async () => {
  await assert.rejects(
    runStack(async (args) => (args[0] === "down" ? 1 : 0)),
    /cleanup failed/
  );
});
