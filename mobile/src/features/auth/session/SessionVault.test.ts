import { describe, expect, it, vi } from "vitest";

import {
  REFRESH_TOKEN_STORAGE_KEY,
  SecureStoreDriver,
  SecureStoreSessionVault,
} from "@/src/infrastructure/session/SecureStoreSessionVault";

import { FakeSessionVault } from "./testing/FakeSessionVault";

vi.mock("expo-secure-store", () => ({
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: 6,
  deleteItemAsync: vi.fn(),
  getItemAsync: vi.fn(),
  setItemAsync: vi.fn(),
}));

const createSecureStoreDriver = () => {
  const values = new Map<string, string>();
  const driver: SecureStoreDriver = {
    getItemAsync: vi.fn(async (key) => values.get(key) ?? null),
    setItemAsync: vi.fn(async (key, value) => {
      values.set(key, value);
    }),
    deleteItemAsync: vi.fn(async (key) => {
      values.delete(key);
    }),
  };

  return { driver, values };
};

describe("SecureStoreSessionVault", () => {
  it("stores, reads and clears only the refresh token key", async () => {
    const { driver, values } = createSecureStoreDriver();
    const vault = new SecureStoreSessionVault(driver);

    await expect(vault.readRefreshToken()).resolves.toBeNull();
    await vault.writeRefreshToken("refresh.token");

    expect(values.get(REFRESH_TOKEN_STORAGE_KEY)).toBe("refresh.token");
    await expect(vault.readRefreshToken()).resolves.toBe("refresh.token");

    await vault.clearRefreshToken();
    await expect(vault.readRefreshToken()).resolves.toBeNull();
    expect(driver.deleteItemAsync).toHaveBeenCalledTimes(1);
  });

  it("rejects empty and oversized values before calling SecureStore", async () => {
    const { driver } = createSecureStoreDriver();
    const vault = new SecureStoreSessionVault(driver);

    await expect(vault.writeRefreshToken("   ")).rejects.toThrow(
      "Refresh token cannot be stored",
    );
    await expect(vault.writeRefreshToken("x".repeat(4097))).rejects.toThrow(
      "Refresh token cannot be stored",
    );
    expect(driver.setItemAsync).not.toHaveBeenCalled();
  });
});

describe("FakeSessionVault", () => {
  it("implements the same lifecycle in memory", async () => {
    const vault = new FakeSessionVault("initial.refresh.token");

    await expect(vault.readRefreshToken()).resolves.toBe(
      "initial.refresh.token",
    );
    await vault.writeRefreshToken("rotated.refresh.token");
    await expect(vault.readRefreshToken()).resolves.toBe(
      "rotated.refresh.token",
    );
    await vault.clearRefreshToken();
    await expect(vault.readRefreshToken()).resolves.toBeNull();

    expect(vault.readCount).toBe(3);
    expect(vault.writtenTokens).toEqual(["rotated.refresh.token"]);
    expect(vault.clearCount).toBe(1);
  });
});
