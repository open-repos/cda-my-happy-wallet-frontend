// @vitest-environment node

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServer } from "vite";

describe("Vite development file access", () => {
  let directory;
  let server;

  beforeAll(async () => {
    directory = await mkdtemp(join(tmpdir(), "wallet-vite-access-"));
    const root = join(directory, "web");
    await mkdir(root);
    // Synthetic fixtures only: never load the application's environment files.
    await writeFile(join(root, "private.pem"), "SYNTHETIC_PRIVATE_MARKER");
    await writeFile(join(root, "allowed.txt"), "SYNTHETIC_PUBLIC_MARKER");
    await writeFile(join(directory, "outside.txt"), "SYNTHETIC_OUTSIDE_MARKER");
    server = await createServer({
      configFile: false,
      envFile: false,
      root,
      publicDir: false,
      cacheDir: join(directory, "cache"),
      logLevel: "silent",
      server: {
        host: "127.0.0.1",
        middlewareMode: true,
        fs: { strict: true, allow: [root] },
      },
    });
  });

  afterAll(async () => {
    await server?.close();
    if (directory) await rm(directory, { recursive: true, force: true });
  });

  it.each(["raw", "url"])(
    "rejects a denied certificate file even with a ?%s query",
    async (query) => {
      await expect(
        server.transformRequest(`/private.pem?${query}`)
      ).rejects.toMatchObject({ code: "ERR_DENIED_ID" });
    }
  );

  it("rejects raw access outside the configured filesystem allow list", async () => {
    await expect(
      server.transformRequest(`/@fs/${join(directory, "outside.txt")}?raw`)
    ).rejects.toMatchObject({ code: "ERR_DENIED_ID" });
  });

  it("still transforms an allowed raw text import", async () => {
    const result = await server.transformRequest("/allowed.txt?raw");
    expect(result.code).toContain("SYNTHETIC_PUBLIC_MARKER");
  });
});
