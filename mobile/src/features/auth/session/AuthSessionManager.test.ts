import { describe, expect, it } from "vitest";

import { AuthGatewayError, AuthSession } from "./AuthGateway";
import { AuthSessionManager } from "./AuthSessionManager";
import { FakeAuthGateway } from "./testing/FakeAuthGateway";
import { FakeSessionVault } from "./testing/FakeSessionVault";

const session = (suffix: string): AuthSession => ({
  user: { email: "user@example.com", firstname: "Test" },
  accessToken: `${suffix}.access.token`,
  accessTokenExpiresIn: 300,
  refreshToken: `${suffix}.refresh.token`,
  refreshTokenExpiresIn: 900,
});

describe("AuthSessionManager", () => {
  it("starts anonymously when no refresh token exists", async () => {
    const gateway = new FakeAuthGateway();
    const vault = new FakeSessionVault();
    const manager = new AuthSessionManager(gateway, vault);

    await manager.bootstrap();

    expect(manager.getSnapshot()).toEqual({ status: "anonymous" });
    expect(gateway.refreshCalls).toEqual([]);
  });

  it("restores a session by rotating the persisted refresh token", async () => {
    const gateway = new FakeAuthGateway();
    const vault = new FakeSessionVault("persisted.refresh.token");
    gateway.refreshImplementation = async () => session("restored");
    const manager = new AuthSessionManager(gateway, vault, () => 1_000);

    await manager.bootstrap();

    expect(gateway.refreshCalls).toEqual(["persisted.refresh.token"]);
    expect(vault.writtenTokens).toEqual(["restored.refresh.token"]);
    expect(manager.getSnapshot()).toEqual({
      status: "authenticated",
      user: session("restored").user,
      accessToken: "restored.access.token",
      accessTokenExpiresAt: 301_000,
    });
    expect(manager.getAccessToken()).toBe("restored.access.token");
  });

  it("clears a session refused by the backend", async () => {
    const gateway = new FakeAuthGateway();
    const vault = new FakeSessionVault("revoked.refresh.token");
    gateway.refreshImplementation = async () => {
      throw new AuthGatewayError("unauthorized", 401);
    };
    const manager = new AuthSessionManager(gateway, vault);

    await expect(manager.bootstrap()).rejects.toMatchObject({
      kind: "unauthorized",
    });

    expect(vault.clearCount).toBe(1);
    await expect(vault.readRefreshToken()).resolves.toBeNull();
    expect(manager.getSnapshot()).toEqual({ status: "anonymous" });
  });

  it("preserves the refresh token when restoration fails offline", async () => {
    const gateway = new FakeAuthGateway();
    const vault = new FakeSessionVault("offline.refresh.token");
    gateway.refreshImplementation = async () => {
      throw new AuthGatewayError("network");
    };
    const manager = new AuthSessionManager(gateway, vault);

    await expect(manager.bootstrap()).rejects.toMatchObject({
      kind: "network",
    });

    expect(vault.clearCount).toBe(0);
    await expect(vault.readRefreshToken()).resolves.toBe(
      "offline.refresh.token",
    );
    expect(manager.getSnapshot()).toEqual({ status: "unavailable" });
  });

  it("leaves the restoring state when the secure vault is unavailable", async () => {
    const gateway = new FakeAuthGateway();
    const vault = new FakeSessionVault();
    vault.readRefreshToken = async () => {
      throw new Error("SecureStore unavailable");
    };
    const manager = new AuthSessionManager(gateway, vault);

    await expect(manager.bootstrap()).rejects.toThrow(
      "SecureStore unavailable",
    );

    expect(manager.getSnapshot()).toEqual({ status: "unavailable" });
    expect(gateway.refreshCalls).toEqual([]);
  });

  it("persists the refresh token before publishing a login", async () => {
    const gateway = new FakeAuthGateway();
    const vault = new FakeSessionVault();
    gateway.createImplementation = async () => session("login");
    const manager = new AuthSessionManager(gateway, vault, () => 2_000);

    await manager.signIn({
      email: "user@example.com",
      password: "Password!1",
    });

    expect(gateway.createCalls).toEqual([
      { email: "user@example.com", password: "Password!1" },
    ]);
    expect(vault.writtenTokens).toEqual(["login.refresh.token"]);
    expect(manager.getSnapshot()).toMatchObject({
      status: "authenticated",
      accessToken: "login.access.token",
      accessTokenExpiresAt: 302_000,
    });
  });

  it("shares one rotation between concurrent callers", async () => {
    const gateway = new FakeAuthGateway();
    const vault = new FakeSessionVault("current.refresh.token");
    let resolveRefresh: ((value: AuthSession) => void) | undefined;
    gateway.refreshImplementation = () =>
      new Promise((resolve) => {
        resolveRefresh = resolve;
      });
    const manager = new AuthSessionManager(gateway, vault);

    const first = manager.refreshAccessToken();
    const second = manager.refreshAccessToken();
    const third = manager.refreshAccessToken();
    await Promise.resolve();

    expect(first).toBe(second);
    expect(second).toBe(third);
    expect(gateway.refreshCalls).toEqual(["current.refresh.token"]);

    resolveRefresh?.(session("rotated"));
    await expect(Promise.all([first, second, third])).resolves.toEqual([
      "rotated.access.token",
      "rotated.access.token",
      "rotated.access.token",
    ]);
    expect(vault.writtenTokens).toEqual(["rotated.refresh.token"]);

    gateway.refreshImplementation = async () => session("next");
    await expect(manager.refreshAccessToken()).resolves.toBe(
      "next.access.token",
    );
    expect(gateway.refreshCalls).toEqual([
      "current.refresh.token",
      "rotated.refresh.token",
    ]);
  });

  it("keeps an active in-memory session when rotation fails offline", async () => {
    const gateway = new FakeAuthGateway();
    const vault = new FakeSessionVault();
    gateway.createImplementation = async () => session("active");
    const manager = new AuthSessionManager(gateway, vault);
    await manager.signIn({
      email: "user@example.com",
      password: "Password!1",
    });
    gateway.refreshImplementation = async () => {
      throw new AuthGatewayError("network");
    };

    await expect(manager.refreshAccessToken()).rejects.toMatchObject({
      kind: "network",
    });

    expect(manager.getSnapshot()).toMatchObject({
      status: "authenticated",
      accessToken: "active.access.token",
    });
    await expect(vault.readRefreshToken()).resolves.toBe(
      "active.refresh.token",
    );
  });

  it("clears local state even when remote logout is unavailable", async () => {
    const gateway = new FakeAuthGateway();
    const vault = new FakeSessionVault("logout.refresh.token");
    gateway.revokeImplementation = async () => {
      throw new AuthGatewayError("network");
    };
    const manager = new AuthSessionManager(gateway, vault);

    await manager.signOut();

    expect(gateway.revokeCalls).toEqual(["logout.refresh.token"]);
    expect(vault.clearCount).toBe(1);
    await expect(vault.readRefreshToken()).resolves.toBeNull();
    expect(manager.getSnapshot()).toEqual({ status: "anonymous" });
  });
});
