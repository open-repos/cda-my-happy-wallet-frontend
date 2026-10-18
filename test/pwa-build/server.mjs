// Serve actual built workers/assets on a synthetic origin; no app session or API.
import { createServer } from "node:http";
import { cp, mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";
import { buildPwaWorker } from "../../scripts/build-pwa-worker.mjs";
import { build } from "vite";

const source = resolve("dist");
const temporary = await mkdtemp(join(tmpdir(), "mhw-generated-worker-"));
// Exercise the real React notice and client against the compiled worker, without
// executing financial routes or shipping proof controls in the application.
const uiDirectory = join(temporary, "update-ui");
await build({
  configFile: false,
  envFile: false,
  publicDir: false,
  logLevel: "silent",
  define: { "process.env.NODE_ENV": JSON.stringify("production") },
  build: {
    outDir: uiDirectory,
    lib: {
      entry: resolve("test/pwa-build/update-page.jsx"),
      name: "PwaUpdateProof",
      formats: ["iife"],
      fileName: () => "updates.js",
      cssFileName: "updates",
    },
    sourcemap: false,
    minify: true,
  },
});
const updateScript = await readFile(join(uiDirectory, "updates.js"));
const updateStyle = await readFile(join(uiDirectory, "updates.css"));
const versions = {};
const bodies = new Map();
const publish = async (name, directory, metadata, probe) => {
  versions[name] = {
    ...metadata,
    probe,
    worker: await readFile(join(directory, "sw.js"), "utf8"),
  };
  for (const path of metadata.assets)
    bodies.set(path, await readFile(resolve(directory, `.${path}`)));
};
const initial = JSON.parse(
  await readFile(join(source, "pwa-build.json"), "utf8")
);
await publish(
  "A",
  source,
  initial,
  initial.assets.find((path) => path.endsWith(".js"))
);
for (const [name, previous, copyFrom, suffix] of [
  ["B", "A", source, "22222222"],
  ["C", "B", source, "33333333"],
  ["rollback", "C", "B", null],
  ["unknown", null, source, "44444444"],
]) {
  const directory = join(temporary, name);
  await cp(copyFrom === "B" ? join(temporary, "B") : copyFrom, directory, {
    recursive: true,
  });
  await mkdir(join(directory, "assets"), { recursive: true });
  const probe = suffix ? `/assets/proof-${suffix}.js` : versions.B.probe;
  if (suffix)
    await writeFile(
      resolve(directory, `.${probe}`),
      `export const publicProof = ${JSON.stringify(name)};`
    );
  const metadata = await buildPwaWorker({
    outDir: directory,
    previous: previous ? versions[previous].build : null,
  });
  await publish(name, directory, metadata, probe);
}
let stage = "A";
const mime = (path) =>
  path.endsWith(".js")
    ? "text/javascript"
    : path.endsWith(".css")
    ? "text/css"
    : path.endsWith(".html")
    ? "text/html"
    : path.endsWith(".woff2")
    ? "font/woff2"
    : path.endsWith(".png")
    ? "image/png"
    : path.endsWith(".svg")
    ? "image/svg+xml"
    : path.endsWith(".webp")
    ? "image/webp"
    : "image/x-icon";
const server = createServer(async (req, res) => {
  const url = new URL(req.url, "http://127.0.0.1:4176");
  const send = (status, type, body, control = "no-store") => {
    res.writeHead(status, {
      "content-type": type === "text/html" ? "text/html; charset=utf-8" : type,
      "cache-control": control,
    });
    res.end(body);
  };
  if (url.pathname === "/__proof/versions") {
    return send(
      200,
      "application/json",
      JSON.stringify(
        Object.fromEntries(
          Object.entries(versions).map(
            ([key, { worker, ...publicMetadata }]) => [key, publicMetadata]
          )
        )
      )
    );
  }
  if (url.pathname === "/__proof/updates.js")
    return send(200, "text/javascript", updateScript);
  if (url.pathname === "/__proof/updates.css")
    return send(200, "text/css", updateStyle);
  if (url.pathname === "/updates")
    return send(
      200,
      "text/html",
      '<!doctype html><html lang="fr"><head><meta name="viewport" content="width=device-width, initial-scale=1"><title>Preuve des mises à jour PWA</title><link rel="stylesheet" href="/__proof/updates.css"><style>body{margin:0;background:var(--ds-color-background-canvas);color:var(--ds-color-text-primary);font:1rem/1.6 system-ui}h1{font-size:1.5rem;margin:1rem}</style><script defer src="/__proof/updates.js"></script></head><body><h1>Preuve des mises à jour</h1><div id="updates"></div></body></html>',
      "private, no-store"
    );
  if (url.pathname === "/__proof/stage" && req.method === "POST") {
    let body = "";
    for await (const chunk of req) {
      body += chunk;
      if (body.length > 64) break;
    }
    if (
      !Object.hasOwn(versions, body) &&
      !["broken", "broken-C"].includes(body)
    )
      return send(400, "text/plain", "Invalid proof stage");
    stage = body;
    return send(200, "text/plain", "ok");
  }
  const broken = stage === "broken" ? "B" : stage === "broken-C" ? "C" : null;
  const version = versions[broken || stage];
  if (url.pathname === "/sw.js")
    return send(200, "text/javascript", version.worker);
  if (url.pathname === "/pwa-build.json") {
    const { worker, ...publicMetadata } = version;
    return send(200, "application/json", JSON.stringify(publicMetadata));
  }
  if (bodies.has(url.pathname)) {
    if (broken && url.pathname === version.probe)
      return send(503, "text/plain", "Synthetic asset failure");
    return send(
      200,
      mime(url.pathname),
      bodies.get(url.pathname),
      "public, max-age=0, must-revalidate"
    );
  }
  if (url.pathname.startsWith("/v1/"))
    return send(
      url.searchParams.has("refused") ? 401 : 200,
      "application/json",
      '{"marker":"synthetic-private-generated-api"}',
      "private, no-store"
    );
  if (["/", "/home", "/calendrier"].includes(url.pathname))
    return send(
      200,
      "text/html",
      '<!doctype html><html lang="fr"><h1>Preuve du worker généré</h1><p>synthetic-private-generated-page</p></html>',
      "private, no-store"
    );
  return send(404, "text/plain", "Not found");
});
server.listen(4176, "127.0.0.1");
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () =>
    server.close(async () => {
      await rm(temporary, { recursive: true, force: true });
    })
  );
