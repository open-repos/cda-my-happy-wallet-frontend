const PREFIX = "mhw-public-v1-";
const BUILD = /^[a-f0-9]{16}$/;
const CACHE = /^mhw-public-v1-[a-f0-9]{16}$/;
const HASHED_ASSET =
  /^\/assets\/[A-Za-z0-9._-]+-[A-Za-z0-9_-]{8,}\.(js|css|woff2|png|svg|webp|ico)$/;
const MIME = {
  js: "application/javascript",
  css: "text/css",
  woff2: "font/woff2",
  png: "image/png",
  svg: "image/svg+xml",
  webp: "image/webp",
  ico: "image/x-icon",
};

export const publicCacheName = (build) => {
  if (typeof build !== "string" || build.length !== 16 || !BUILD.test(build))
    throw new Error("Invalid public build identifier");
  return `${PREFIX}${build}`;
};

/** Only our exact namespace is disposable. Keep current + previous after activation. */
export const obsoletePublicCaches = (
  names,
  current,
  previous = null,
  pending = []
) => {
  const valid = (name) =>
    typeof name === "string" &&
    name.length === PREFIX.length + 16 &&
    CACHE.test(name);
  if (
    !valid(current) ||
    (previous !== null && !valid(previous)) ||
    !pending.every(valid)
  ) {
    throw new Error("Invalid public cache name");
  }
  return names.filter(
    (name) =>
      valid(name) &&
      name !== current &&
      name !== previous &&
      !pending.includes(name)
  );
};

/** Fail closed: only explicit build outputs and the neutral offline document. */
export const createCachePolicy = ({ origin, assets }) => {
  const base = new URL(origin);
  if (base.origin !== origin || !["http:", "https:"].includes(base.protocol)) {
    throw new Error("Invalid application origin");
  }
  const allowed = new Map();
  for (const path of assets) {
    const url = new URL(path, origin);
    if (
      url.origin !== origin ||
      url.pathname !== path ||
      url.search ||
      url.hash
    )
      throw new Error("Invalid public asset list");
    const hashed = HASHED_ASSET.exec(path);
    const type =
      path === "/offline.html" ? "text/html" : hashed && MIME[hashed[1]];
    if (!type || allowed.has(path))
      throw new Error("Invalid public asset list");
    allowed.set(path, type);
  }

  const classify = (request) => {
    let url;
    try {
      url = new URL(request.url);
    } catch {
      return "network-only";
    }
    if (
      request.method !== "GET" ||
      url.origin !== origin ||
      url.username ||
      url.password ||
      request.headers.has("authorization")
    )
      return "network-only";
    if (request.mode === "navigate") return "navigation";
    if (url.search || url.hash) return "network-only";
    return allowed.has(url.pathname) ? "public-asset" : "network-only";
  };

  return {
    classify,
    publicPaths: [...allowed.keys()],
    publicRequest(request) {
      if (classify(request) !== "public-asset") {
        throw new Error("Request is not a public asset");
      }
      return new Request(request.url, {
        credentials: "omit",
        cache: "no-store",
        redirect: "error",
        mode: "same-origin",
        referrerPolicy: "no-referrer",
      });
    },
    canStore(request, response) {
      if (classify(request) !== "public-asset") return false;
      const type = response.headers
        .get("content-type")
        ?.split(";")[0]
        .trim()
        .toLowerCase();
      const expected = allowed.get(new URL(request.url).pathname);
      const validType =
        type === expected ||
        (expected === "application/javascript" && type === "text/javascript");
      return (
        response.status === 200 &&
        ["basic", "default"].includes(response.type) &&
        !response.redirected &&
        validType &&
        !/\b(no-store|private)\b/i.test(
          response.headers.get("cache-control") || ""
        ) &&
        response.headers.get("vary")?.trim() !== "*"
      );
    },
  };
};
