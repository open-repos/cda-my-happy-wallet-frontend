import { createHash } from "node:crypto";
import { lstat, readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { build as viteBuild } from "vite";
import {
  createCachePolicy,
  publicCacheName,
} from "../src/js/pwa/cachePolicy.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const origin = "https://public-build.invalid";

const pathsIn = async (directory, prefix) => {
  const paths = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const absolute = resolve(directory, entry.name);
    const path = `${prefix}/${entry.name}`;
    if (entry.isSymbolicLink())
      throw new Error("Public assets must not contain symbolic links");
    if (entry.isDirectory()) paths.push(...(await pathsIn(absolute, path)));
    else if (entry.isFile()) {
      try {
        createCachePolicy({ origin, assets: [path] });
        paths.push(path);
      } catch {
        /* Unknown outputs are not public precache entries. */
      }
    }
  }
  return paths;
};

/** Generate only a self-contained worker and public build metadata in the output. */
export const buildPwaWorker = async ({
  outDir = resolve(root, "dist"),
  previous = null,
} = {}) => {
  if (previous !== null) publicCacheName(previous);
  if (
    !(await lstat(outDir)).isDirectory() ||
    (await lstat(outDir)).isSymbolicLink()
  )
    throw new Error("Expected a regular build directory");
  for (const path of ["sw.js", "pwa-build.json"]) {
    try {
      const output = await lstat(resolve(outDir, path));
      if (!output.isFile() || output.isSymbolicLink())
        throw new Error("Expected regular public worker outputs");
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }
  const assetDirectory = resolve(outDir, "assets");
  if (
    !(await lstat(assetDirectory)).isDirectory() ||
    (await lstat(assetDirectory)).isSymbolicLink()
  )
    throw new Error("Expected a regular assets directory");
  const assets = (await pathsIn(assetDirectory, "/assets")).sort();
  if (!assets.some((path) => path.endsWith(".js")))
    throw new Error("Build must contain a public JavaScript asset");
  try {
    const offline = await lstat(resolve(outDir, "offline.html"));
    if (!offline.isFile() || offline.isSymbolicLink())
      throw new Error("Expected a regular offline document");
    assets.push("/offline.html");
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  createCachePolicy({ origin, assets });
  const hash = createHash("sha256");
  hash.update(JSON.stringify({ assets, previous }));
  for (const path of assets) {
    hash.update(path);
    hash.update(await readFile(resolve(outDir, `.${path}`)));
  }
  for (const path of [
    "src/js/pwa/cachePolicy.js",
    "src/js/pwa/publicWorker.js",
    "src/js/pwa/serviceWorker.js",
    "scripts/build-pwa-worker.mjs",
    "package-lock.json",
  ]) {
    hash.update(path);
    hash.update(await readFile(resolve(root, path)));
  }
  const version = hash.digest("hex").slice(0, 16);
  const metadata = { build: version, previous, assets };
  await viteBuild({
    configFile: false,
    publicDir: false,
    envFile: false,
    logLevel: "error",
    define: { __MHW_PWA_CONFIG__: JSON.stringify(metadata) },
    build: {
      outDir,
      emptyOutDir: false,
      sourcemap: false,
      minify: true,
      lib: {
        entry: resolve(root, "src/js/pwa/serviceWorker.js"),
        name: "MhwPublicWorker",
        formats: ["iife"],
        fileName: () => "sw.js",
      },
    },
  });
  await writeFile(
    resolve(outDir, "pwa-build.json"),
    JSON.stringify(metadata, null, 2) + "\n"
  );
  return metadata;
};

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const args = process.argv.slice(2);
  if (
    args.some((value) => !value.startsWith("--previous-build=")) ||
    args.length > 1
  )
    throw new Error(
      "Expected at most --previous-build=<public build identifier>"
    );
  const previous = args.length
    ? args[0].slice("--previous-build=".length)
    : null;
  const result = await buildPwaWorker({ previous });
  console.log(
    `Generated public worker ${result.build} (${result.assets.length} assets); application registration remains disabled.`
  );
}
