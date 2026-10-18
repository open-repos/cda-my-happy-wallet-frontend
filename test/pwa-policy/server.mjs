// Synthetic proof server only. No app build, real API, credentials or external hosts.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";

let build = "1111111111111111";
let previous = "";
let failInstall = false;
const worker = await readFile(new URL("./worker.mjs", import.meta.url), "utf8");
const policy = await readFile(
  new URL("../../src/js/pwa/cachePolicy.js", import.meta.url),
  "utf8"
);
const page =
  '<!doctype html><html lang="fr"><title>Preuve de politique PWA</title><h1>En ligne</h1><p>synthetic-private-page</p></html>';
const offline =
  '<!doctype html><html lang="fr"><title>Hors ligne</title><h1>Connexion indisponible</h1><p>Reconnectez-vous pour consulter votre budget.</p></html>';
const server = createServer(async (req, res) => {
  const url = new URL(req.url, "http://127.0.0.1:4175");
  const send = (status, type, body, control = "no-store") => {
    res.writeHead(status, { "content-type": type, "cache-control": control });
    res.end(body);
  };
  if (req.method === "POST" && url.pathname === "/__proof/build") {
    let body = "";
    for await (const chunk of req) {
      body += chunk;
      if (body.length > 256) break;
    }
    try {
      const next = JSON.parse(body);
      if (
        !/^[a-f0-9]{16}$/.test(next.build) ||
        (next.previous && !/^[a-f0-9]{16}$/.test(next.previous))
      )
        throw new Error();
      build = next.build;
      previous = next.previous || "";
      failInstall = next.failInstall === true;
      return send(200, "application/json", '{"ok":true}');
    } catch {
      return send(400, "text/plain", "Invalid proof setup");
    }
  }
  if (url.pathname === "/sw.js")
    return send(
      200,
      "application/javascript",
      worker.replace("__BUILD__", build).replace("__PREVIOUS__", previous)
    );
  if (url.pathname === "/cache-policy.js")
    return send(200, "application/javascript", policy);
  if (/^\/assets\/proof-[a-f0-9]{16}\.js$/.test(url.pathname)) {
    if (failInstall) return send(503, "text/plain", "Synthetic asset failure");
    return send(
      200,
      "application/javascript",
      `export const publicBuild = ${JSON.stringify(url.pathname)};`,
      "public, max-age=31536000, immutable"
    );
  }
  if (url.pathname === "/offline.html")
    return send(
      200,
      "text/html",
      offline,
      "public, max-age=0, must-revalidate"
    );
  if (url.pathname.startsWith("/v1/")) {
    const status = url.searchParams.get("status") === "401" ? 401 : 200;
    return send(
      status,
      "application/json",
      '{"marker":"synthetic-private-api"}',
      "private, no-store"
    );
  }
  if (["/", "/home", "/calendrier"].includes(url.pathname))
    return send(200, "text/html", page);
  return send(404, "text/plain", "Not found");
});
server.listen(4175, "127.0.0.1");
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => server.close());
