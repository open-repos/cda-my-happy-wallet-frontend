import { describe, expect, it } from "vitest";
import {
  createCachePolicy,
  obsoletePublicCaches,
  publicCacheName,
} from "../../src/js/pwa/cachePolicy";

const origin = "https://wallet.example.test";
const asset = "/assets/index-1234abcd.js";
const policy = createCachePolicy({ origin, assets: [asset, "/offline.html"] });
const request = (path = asset, options = {}) =>
  new Request(origin + path, options);
const response = (overrides = {}) => ({
  status: 200,
  type: "basic",
  redirected: false,
  headers: new Headers({
    "content-type": "application/javascript",
    "cache-control": "public, max-age=31536000, immutable",
  }),
  ...overrides,
});

describe("PWA public cache boundary", () => {
  it.each([
    "/v1/operations",
    "/v1/auth/login",
    "/v1/auth/refresh",
    "/home",
    "/calendrier",
    "/index.html",
    "/manifest.webmanifest",
    "/unknown.js",
    asset + "?token=synthetic",
    asset + "#synthetic",
  ])("never persists %s", (path) => {
    expect(policy.classify(request(path))).toBe("network-only");
    expect(policy.canStore(request(path), response())).toBe(false);
  });
  it.each(["POST", "PUT", "PATCH", "DELETE", "HEAD"])(
    "never caches %s",
    (method) => {
      expect(policy.canStore(request(asset, { method }), response())).toBe(
        false
      );
    }
  );
  it("rejects cross-origin and authorized requests even to an allowlisted path", () => {
    expect(
      policy.classify(new Request("https://other.example.test" + asset))
    ).toBe("network-only");
    expect(
      policy.classify(
        request(asset, { headers: { authorization: "Bearer synthetic" } })
      )
    ).toBe("network-only");
    expect(policy.classify({ url: "broken" })).toBe("network-only");
  });
  it.each([
    "/v1/operations",
    "/index.html",
    "/assets/index.js",
    asset + "?secret=x",
    "//other.example.test/x.js",
    "/assets/x-1234abcd.json",
  ])("refuses unsafe manifest entry %s", (path) => {
    expect(() => createCachePolicy({ origin, assets: [path] })).toThrow(
      "Invalid public asset list"
    );
  });
  it("distinguishes navigation from public assets without caching navigation HTML", () => {
    const navigation = {
      url: origin + "/home",
      method: "GET",
      mode: "navigate",
      headers: new Headers(),
    };
    expect(policy.classify(navigation)).toBe("navigation");
    expect(policy.canStore(navigation, response())).toBe(false);
    expect(policy.canStore(request(), response())).toBe(true);
    expect(
      policy.canStore(
        request(),
        response({
          headers: new Headers({
            "content-type": "text/javascript; charset=utf-8",
          }),
        })
      )
    ).toBe(true);
    expect(
      policy.canStore(
        request("/offline.html"),
        response({ headers: new Headers({ "content-type": "text/html" }) })
      )
    ).toBe(true);
  });
  it("fetches public assets without cookies, authorization, referrer or HTTP-cache reuse", () => {
    const safe = policy.publicRequest(
      request(asset, { headers: { "x-private": "synthetic" } })
    );
    expect(safe.credentials).toBe("omit");
    expect(safe.cache).toBe("no-store");
    expect(safe.redirect).toBe("error");
    expect(safe.referrerPolicy).toBe("no-referrer");
    expect([...safe.headers]).toEqual([]);
    expect(() => policy.publicRequest(request("/v1/operations"))).toThrow();
  });
  it.each([
    { status: 401 },
    { status: 500 },
    { status: 206 },
    { type: "opaque" },
    { redirected: true },
    { headers: new Headers({ "content-type": "text/html" }) },
    {
      headers: new Headers({
        "content-type": "application/javascript",
        "cache-control": "PRIVATE, max-age=20",
      }),
    },
    {
      headers: new Headers({
        "content-type": "application/javascript",
        "cache-control": "no-store",
      }),
    },
    {
      headers: new Headers({
        "content-type": "application/javascript",
        vary: "*",
      }),
    },
  ])("refuses unsafe response %#", (overrides) => {
    expect(policy.canStore(request(), response(overrides))).toBe(false);
  });
  it("rejects invalid origins and duplicate assets", () => {
    expect(() =>
      createCachePolicy({ origin: origin + "/private", assets: [] })
    ).toThrow();
    expect(() =>
      createCachePolicy({ origin, assets: [asset, asset] })
    ).toThrow();
  });
  it("only deletes obsolete caches in its own exact namespace", () => {
    const old = publicCacheName("1111111111111111");
    const previous = publicCacheName("2222222222222222");
    const current = publicCacheName("3333333333333333");
    expect(
      obsoletePublicCaches(
        ["another-app", "mhw-public-v1-invalid", old, previous, current],
        current,
        previous
      )
    ).toEqual([old]);
    expect(
      obsoletePublicCaches([current, previous], previous, current)
    ).toEqual([]);
    const pending = publicCacheName("4444444444444444");
    expect(
      obsoletePublicCaches(
        [old, pending, current, previous],
        current,
        previous,
        [pending]
      )
    ).toEqual([old]);
    expect(() => publicCacheName("1111111111111111\n")).toThrow();
    expect(() => publicCacheName("../../private")).toThrow();
    expect(() => obsoletePublicCaches([], "another-app")).toThrow();
  });
});
