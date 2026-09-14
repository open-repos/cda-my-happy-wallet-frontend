import { afterEach, describe, expect, it, vi } from "vitest";

import { getApiReadiness } from "./getApiReadiness";

describe("getApiReadiness", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("accepts a ready API response", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      json: async () => ({ status: "ok" }),
      ok: true,
      status: 200,
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(getApiReadiness()).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.myhappywallet.andriacapai.com/health/ready",
      { headers: { Accept: "application/json" } },
    );
  });

  it("rejects an unavailable API response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 503 }),
    );

    await expect(getApiReadiness()).rejects.toThrow(
      "Health request failed with status 503",
    );
  });
});
