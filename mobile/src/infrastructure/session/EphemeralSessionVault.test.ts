import { describe, expect, it } from "vitest";

import { EphemeralSessionVault } from "./EphemeralSessionVault";

describe("EphemeralSessionVault", () => {
  it("keeps a refresh token only for the current runtime", async () => {
    const vault = new EphemeralSessionVault();

    await expect(vault.readRefreshToken()).resolves.toBeNull();
    await vault.writeRefreshToken("refresh.token");
    await expect(vault.readRefreshToken()).resolves.toBe("refresh.token");
    await vault.clearRefreshToken();
    await expect(vault.readRefreshToken()).resolves.toBeNull();
  });
});
