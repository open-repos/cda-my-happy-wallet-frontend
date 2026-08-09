import { describe, expect, it } from "vitest";

import { AuthGatewayError } from "@/src/features/auth/session/AuthGateway";
import { AuthSessionManager } from "@/src/features/auth/session/AuthSessionManager";
import { FetchAuthGateway } from "@/src/infrastructure/auth/FetchAuthGateway";
import { AuthorizedHttpClient } from "@/src/infrastructure/http/AuthorizedHttpClient";
import { EphemeralSessionVault } from "@/src/infrastructure/session/EphemeralSessionVault";

class FakeNativeAuthServer {
  public refreshRequests = 0;
  public protectedRequests = 0;
  public revokedTokens: string[] = [];
  public online = true;

  private tokenVersion = 0;
  private activeAccessToken: string | null = null;
  private activeRefreshToken: string | null = null;
  private expiredAccessToken: string | null = null;

  public readonly fetch: typeof fetch = async (input, init) => {
    if (!this.online) {
      throw new TypeError("Network unavailable");
    }

    const url = String(input);
    if (url.endsWith("/auth/native/sessions")) {
      return this.createSession();
    }
    if (url.endsWith("/auth/native/sessions/refresh")) {
      return this.refreshSession(init);
    }
    if (url.endsWith("/auth/native/sessions/revoke")) {
      return this.revokeSession(init);
    }
    if (url.endsWith("/operations")) {
      return this.readProtectedResource(init);
    }
    return new Response(null, { status: 404 });
  };

  public expireAccessToken(): void {
    this.expiredAccessToken = this.activeAccessToken;
  }

  private createSession(): Response {
    this.issueTokens();
    return this.sessionResponse();
  }

  private refreshSession(init?: RequestInit): Response {
    this.refreshRequests += 1;
    const refreshToken = this.readBody(init).refreshToken;
    if (
      typeof refreshToken !== "string" ||
      refreshToken !== this.activeRefreshToken
    ) {
      return new Response(null, { status: 401 });
    }

    this.issueTokens();
    return this.sessionResponse();
  }

  private revokeSession(init?: RequestInit): Response {
    const refreshToken = this.readBody(init).refreshToken;
    if (typeof refreshToken === "string") {
      this.revokedTokens.push(refreshToken);
      if (refreshToken === this.activeRefreshToken) {
        this.activeRefreshToken = null;
        this.activeAccessToken = null;
      }
    }
    return new Response(null, { status: 204 });
  }

  private readProtectedResource(init?: RequestInit): Response {
    this.protectedRequests += 1;
    const authorization = new Headers(init?.headers).get("Authorization");
    const expectedAuthorization = `Bearer ${this.activeAccessToken}`;
    if (
      authorization !== expectedAuthorization ||
      this.activeAccessToken === this.expiredAccessToken
    ) {
      return new Response(null, { status: 401 });
    }
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  private issueTokens(): void {
    this.tokenVersion += 1;
    this.activeAccessToken = `access-${this.tokenVersion}`;
    this.activeRefreshToken = `refresh-${this.tokenVersion}`;
    this.expiredAccessToken = null;
  }

  private sessionResponse(): Response {
    return new Response(
      JSON.stringify({
        success: true,
        payload: {
          user: { email: "user@example.com" },
          accessToken: this.activeAccessToken,
          accessTokenExpiresIn: 300,
          refreshToken: this.activeRefreshToken,
          refreshTokenExpiresIn: 900,
        },
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  private readBody(init?: RequestInit): Record<string, unknown> {
    return JSON.parse(String(init?.body)) as Record<string, unknown>;
  }
}

const createSystem = (
  server: FakeNativeAuthServer,
  vault = new EphemeralSessionVault(),
) => {
  const gateway = new FetchAuthGateway(
    "https://api.example.test/v1",
    server.fetch,
  );
  const manager = new AuthSessionManager(gateway, vault, () => 1_000);
  const client = new AuthorizedHttpClient(
    "https://api.example.test/v1",
    manager,
    server.fetch,
  );
  return { client, manager, vault };
};

describe("native authentication flow", () => {
  it("logs in, shares one rotation between requests and logs out", async () => {
    const server = new FakeNativeAuthServer();
    const { client, manager, vault } = createSystem(server);

    await manager.signIn({
      email: "user@example.com",
      password: "Password!1",
    });
    await expect(vault.readRefreshToken()).resolves.toBe("refresh-1");
    server.expireAccessToken();

    const responses = await Promise.all([
      client.request("/operations"),
      client.request("/operations"),
    ]);

    expect(responses.map(({ status }) => status)).toEqual([200, 200]);
    expect(server.refreshRequests).toBe(1);
    expect(server.protectedRequests).toBe(4);
    await expect(vault.readRefreshToken()).resolves.toBe("refresh-2");

    await manager.signOut();

    expect(server.revokedTokens).toEqual(["refresh-2"]);
    await expect(vault.readRefreshToken()).resolves.toBeNull();
    expect(manager.getSnapshot()).toEqual({ status: "anonymous" });
  });

  it("restores a persisted session by rotating it after restart", async () => {
    const server = new FakeNativeAuthServer();
    const vault = new EphemeralSessionVault();
    const firstRuntime = createSystem(server, vault);
    await firstRuntime.manager.signIn({
      email: "user@example.com",
      password: "Password!1",
    });

    const restartedRuntime = createSystem(server, vault);
    await restartedRuntime.manager.bootstrap();

    expect(server.refreshRequests).toBe(1);
    await expect(vault.readRefreshToken()).resolves.toBe("refresh-2");
    expect(restartedRuntime.manager.getSnapshot()).toMatchObject({
      status: "authenticated",
      accessToken: "access-2",
      accessTokenExpiresAt: 301_000,
    });
  });

  it("clears a refresh token revoked by the server", async () => {
    const server = new FakeNativeAuthServer();
    const vault = new EphemeralSessionVault();
    await vault.writeRefreshToken("revoked-refresh-token");
    const { manager } = createSystem(server, vault);

    await expect(manager.bootstrap()).rejects.toBeInstanceOf(AuthGatewayError);

    await expect(vault.readRefreshToken()).resolves.toBeNull();
    expect(manager.getSnapshot()).toEqual({ status: "anonymous" });
  });

  it("keeps the refresh token when restoration fails offline", async () => {
    const server = new FakeNativeAuthServer();
    const vault = new EphemeralSessionVault();
    await vault.writeRefreshToken("offline-refresh-token");
    server.online = false;
    const { manager } = createSystem(server, vault);

    await expect(manager.bootstrap()).rejects.toMatchObject({
      kind: "network",
    });

    await expect(vault.readRefreshToken()).resolves.toBe(
      "offline-refresh-token",
    );
    expect(manager.getSnapshot()).toEqual({ status: "unavailable" });
  });
});
