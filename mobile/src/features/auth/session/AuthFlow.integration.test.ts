import { describe, expect, it } from "vitest";

import { AuthGatewayError } from "@/src/features/auth/session/AuthGateway";
import { AuthSessionManager } from "@/src/features/auth/session/AuthSessionManager";
import { FetchAuthGateway } from "@/src/infrastructure/auth/FetchAuthGateway";
import { FetchPublicAccountGateway } from "@/src/infrastructure/auth/FetchPublicAccountGateway";
import { AuthorizedHttpClient } from "@/src/infrastructure/http/AuthorizedHttpClient";
import { EphemeralSessionVault } from "@/src/infrastructure/session/EphemeralSessionVault";

class FakeNativeAuthServer {
  public registrationRequests = 0;
  public verificationRequests = 0;
  public refreshRequests = 0;
  public protectedRequests = 0;
  public revokedTokens: string[] = [];
  public online = true;

  private readonly requireVerifiedRegistration: boolean;
  private tokenVersion = 0;
  private activeAccessToken: string | null = null;
  private activeRefreshToken: string | null = null;
  private expiredAccessToken: string | null = null;
  private account:
    | {
        id: string;
        email: string;
        firstname: string;
        lastname: string;
        password: string;
        verificationToken: string;
        verified: boolean;
      }
    | undefined;

  public constructor(requireVerifiedRegistration = false) {
    this.requireVerifiedRegistration = requireVerifiedRegistration;
  }

  public readonly fetch: typeof fetch = async (input, init) => {
    if (!this.online) {
      throw new TypeError("Network unavailable");
    }

    const url = String(input);
    if (url.endsWith("/users/register")) {
      return this.register(init);
    }
    if (url.includes("/users/verify/")) {
      return this.verifyRegistration(url);
    }
    if (url.endsWith("/auth/native/sessions")) {
      return this.createSession(init);
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

  public getVerificationUrl(): string {
    if (this.account == null) {
      throw new Error("No registration is awaiting verification");
    }

    return `https://api.example.test/v1/users/verify/${this.account.id}/${this.account.verificationToken}`;
  }

  private register(init?: RequestInit): Response {
    this.registrationRequests += 1;
    const body = this.readBody(init);
    if (
      typeof body.email !== "string" ||
      typeof body.firstname !== "string" ||
      typeof body.lastname !== "string" ||
      typeof body.password !== "string"
    ) {
      return new Response(null, { status: 422 });
    }

    this.account = {
      id: "registered-user",
      email: body.email,
      firstname: body.firstname,
      lastname: body.lastname,
      password: body.password,
      verificationToken: "single-use-verification-token",
      verified: false,
    };
    return new Response(null, { status: 201 });
  }

  private verifyRegistration(url: string): Response {
    this.verificationRequests += 1;
    if (this.account == null || url !== this.getVerificationUrl()) {
      return new Response(null, { status: 401 });
    }
    if (this.account.verified) {
      return new Response(null, { status: 409 });
    }

    this.account.verified = true;
    return new Response(null, { status: 201 });
  }

  private createSession(init?: RequestInit): Response {
    if (this.requireVerifiedRegistration) {
      const credentials = this.readBody(init);
      if (
        this.account == null ||
        !this.account.verified ||
        credentials.email !== this.account.email ||
        credentials.password !== this.account.password
      ) {
        return new Response(null, { status: 401 });
      }
    }

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
    const user = this.account ?? {
      email: "user@example.com",
      firstname: "Test",
      lastname: "User",
    };
    return new Response(
      JSON.stringify({
        success: true,
        payload: {
          user: {
            email: user.email,
            firstname: user.firstname,
            lastname: user.lastname,
          },
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
  const accountGateway = new FetchPublicAccountGateway(
    "https://api.example.test/v1",
    server.fetch,
  );
  return { accountGateway, client, manager, vault };
};

describe("native authentication flow", () => {
  it("registers, confirms, signs in, refreshes and logs out", async () => {
    const server = new FakeNativeAuthServer(true);
    const { accountGateway, client, manager, vault } = createSystem(server);
    const credentials = {
      email: "new.user@example.com",
      password: "Password!1",
    };

    await accountGateway.register({
      firstname: " New ",
      lastname: " User ",
      email: " NEW.USER@Example.com ",
      password: credentials.password,
      confirmpassword: credentials.password,
    });

    expect(server.registrationRequests).toBe(1);
    await expect(manager.signIn(credentials)).rejects.toMatchObject({
      kind: "unauthorized",
      status: 401,
    });
    await expect(vault.readRefreshToken()).resolves.toBeNull();

    const verificationUrl = server.getVerificationUrl();
    await expect(server.fetch(verificationUrl)).resolves.toMatchObject({
      status: 201,
    });
    await expect(server.fetch(verificationUrl)).resolves.toMatchObject({
      status: 409,
    });
    expect(server.verificationRequests).toBe(2);

    await manager.signIn(credentials);
    await expect(vault.readRefreshToken()).resolves.toBe("refresh-1");
    expect(manager.getSnapshot()).toMatchObject({
      status: "authenticated",
      user: {
        email: credentials.email,
        firstname: "New",
        lastname: "User",
      },
    });

    server.expireAccessToken();
    await expect(client.request("/operations")).resolves.toMatchObject({
      status: 200,
    });
    expect(server.refreshRequests).toBe(1);
    await expect(vault.readRefreshToken()).resolves.toBe("refresh-2");

    await manager.signOut();

    expect(server.revokedTokens).toEqual(["refresh-2"]);
    await expect(vault.readRefreshToken()).resolves.toBeNull();
    expect(manager.getSnapshot()).toEqual({ status: "anonymous" });
  });

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
