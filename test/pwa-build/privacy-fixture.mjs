// Synthetic HTTP behavior only. This does not implement or prove backend #98.
export const createPrivacyFixture = () => {
  let mode = "public";
  let writes = 0;
  let reads = 0;
  let observations = [];
  const modes = new Set([
    "public",
    "private",
    "no-store",
    "vary",
    "html",
    "error",
    "redirect",
  ]);
  return async ({ req, url, send, version }) => {
    if (url.pathname === "/__proof/privacy") {
      if (req.method === "POST") {
        let body = "";
        for await (const chunk of req) {
          body += chunk;
          if (body.length > 128) {
            send(400, "text/plain", "Invalid fixture control");
            return true;
          }
        }
        if (!modes.has(body)) {
          send(400, "text/plain", "Invalid fixture mode");
          return true;
        }
        mode = body;
        observations = [];
        if (url.searchParams.has("reset")) writes = reads = 0;
      }
      send(
        200,
        "application/json",
        JSON.stringify({ writes, reads, observations })
      );
      return true;
    }
    if (url.pathname.startsWith("/v1/__privacy/")) {
      const owner =
        /(?:^|;\s*)mhw-proof-owner=([AB])(?:;|$)/.exec(
          req.headers.cookie || ""
        )?.[1] || "anonymous";
      if (["GET", "HEAD"].includes(req.method)) reads += 1;
      else writes += 1;
      const status = Number(url.searchParams.get("status") || 200);
      if (![200, 204, 400, 401, 403, 404, 422, 429, 500].includes(status)) {
        send(400, "text/plain", "Invalid fixture status");
        return true;
      }
      send(
        status,
        "application/json",
        JSON.stringify({
          marker: `synthetic-private-boundary-owner-${owner}`,
          reads,
          writes,
        }),
        "private, no-store"
      );
      return true;
    }
    if (url.pathname !== version.probe) return false;
    observations.push({
      cookie: !!req.headers.cookie,
      authorization: !!req.headers.authorization,
      custom: !!req.headers["x-private-proof"],
      referrer: !!req.headers.referer,
    });
    if (req.headers.authorization) {
      send(
        200,
        "text/javascript",
        "synthetic-private-boundary-authorized-asset",
        "private, no-store"
      );
      return true;
    }
    if (mode === "public") return false;
    if (mode === "redirect") {
      send(302, "text/plain", "", "no-store", {
        location: "/v1/__privacy/redirect",
      });
      return true;
    }
    send(
      mode === "error" ? 500 : 200,
      mode === "html" ? "text/html" : "text/javascript",
      "synthetic-private-boundary-public-response",
      mode === "private"
        ? "private"
        : mode === "no-store"
        ? "no-store"
        : "public, max-age=0",
      mode === "vary" ? { vary: "*" } : {}
    );
    return true;
  };
};
