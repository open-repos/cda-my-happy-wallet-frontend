import assert from "node:assert/strict";
import { test } from "node:test";
import {
  mkdtemp,
  mkdir,
  readFile,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Script } from "node:vm";
import { buildPwaWorker } from "../scripts/build-pwa-worker.mjs";

const fixture = async (action) => {
  const outDir = await mkdtemp(join(tmpdir(), "mhw-public-worker-"));
  try {
    await mkdir(join(outDir, "assets"));
    await writeFile(
      join(outDir, "assets/index-1234abcd.js"),
      "export const publicValue = 'A';"
    );
    await action(outDir);
  } finally {
    await rm(outDir, { recursive: true, force: true });
  }
};

test("emits deterministic self-contained workers with only explicit public assets", () =>
  fixture(async (outDir) => {
    await writeFile(
      join(outDir, "assets/index-1234abcd.css"),
      "body { color: green; }"
    );
    await writeFile(join(outDir, "index.html"), "synthetic-private-navigation");
    await writeFile(
      join(outDir, "assets/private.json"),
      "synthetic-private-data"
    );
    await writeFile(
      join(outDir, "assets/private-1234abcd.json"),
      "synthetic-private-data"
    );
    await writeFile(
      join(outDir, "assets/index-1234abcd.js.map"),
      "synthetic-private-source"
    );
    await writeFile(
      join(outDir, "offline.html"),
      "<h1>Connexion indisponible</h1>"
    );
    const first = await buildPwaWorker({ outDir });
    assert.deepEqual(first.assets, [
      "/assets/index-1234abcd.css",
      "/assets/index-1234abcd.js",
      "/offline.html",
    ]);
    assert.match(first.build, /^[a-f0-9]{16}$/);
    assert.equal(first.previous, null);
    const source = await readFile(join(outDir, "sw.js"), "utf8");
    assert.doesNotMatch(
      source,
      /synthetic-private|__MHW_PWA_CONFIG__|sourceMappingURL/
    );
    new Script(source); // Parse an actual classic worker; no external module resolution.
    assert.deepEqual(
      JSON.parse(await readFile(join(outDir, "pwa-build.json"), "utf8")),
      first
    );
    const repeated = await buildPwaWorker({ outDir });
    assert.deepEqual(repeated, first);
    assert.equal(await readFile(join(outDir, "sw.js"), "utf8"), source);
    await writeFile(
      join(outDir, "assets/index-1234abcd.js"),
      "export const publicValue = 'B';"
    );
    const changed = await buildPwaWorker({ outDir, previous: first.build });
    assert.notEqual(changed.build, first.build);
    assert.equal(changed.previous, first.build);
    assert.ok(
      (await readFile(join(outDir, "sw.js"), "utf8")).includes(changed.build)
    );
  }));

test("rejects malformed previous-release identifiers before writing", () =>
  fixture(async (outDir) => {
    for (const previous of [
      "",
      "../private",
      "1111111111111111\n",
      "https://example.test",
      "123",
    ]) {
      await assert.rejects(
        buildPwaWorker({ outDir, previous }),
        /Invalid public build identifier/
      );
    }
  }));

test("refuses symbolic asset links without reading a private target", () =>
  fixture(async (outDir) => {
    await writeFile(join(outDir, "private-target"), "synthetic-private");
    await symlink(
      join(outDir, "private-target"),
      join(outDir, "assets/link-1234abcd.js")
    );
    await assert.rejects(buildPwaWorker({ outDir }), /symbolic links/);
  }));

test("refuses symbolic output links rather than overwriting their targets", () =>
  fixture(async (outDir) => {
    const target = join(outDir, "private-target");
    await writeFile(target, "synthetic-private");
    await symlink(target, join(outDir, "pwa-build.json"));
    await assert.rejects(
      buildPwaWorker({ outDir }),
      /regular public worker outputs/
    );
    assert.equal(await readFile(target, "utf8"), "synthetic-private");
  }));

test("refuses symbolic offline documents", () =>
  fixture(async (outDir) => {
    await writeFile(join(outDir, "private-target"), "synthetic-private");
    await symlink(join(outDir, "private-target"), join(outDir, "offline.html"));
    await assert.rejects(
      buildPwaWorker({ outDir }),
      /regular offline document/
    );
  }));

test("rejects a build with no public JavaScript entry", () =>
  fixture(async (outDir) => {
    await rm(join(outDir, "assets/index-1234abcd.js"));
    await writeFile(join(outDir, "assets/private.json"), "synthetic-private");
    await assert.rejects(buildPwaWorker({ outDir }), /public JavaScript asset/);
  }));
