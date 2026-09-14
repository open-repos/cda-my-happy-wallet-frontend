import { afterEach, describe, expect, it, vi } from "vitest";

import { FetchAuthGateway } from "./FetchAuthGateway";

const sessionResponse = {
  success: true,
  payload: {
    user: { email: "user@example.com", firstname: "Test" },
    accessToken: "access.token",
    accessTokenExpiresIn: 300,
    refreshToken: "refresh.token",
    refreshTokenExpiresIn: 900,
  },
};

describe("FetchAuthGateway", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("creates a native session through the versioned API", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(sessionResponse), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    const gateway = new FetchAuthGateway(
      "https://api.example.test/v1/",
      fetchMock,
    );

    await expect(
      gateway.createSession({
        email: "user@example.com",
        password: "Password!1",
      }),
    ).resolves.toEqual(sessionResponse.payload);

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.test/v1/auth/native/sessions",
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: "user@example.com",
          password: "Password!1",
        }),
      },
    );
  });

  it("maps an unauthorized refresh without exposing the token", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 401 }));
    const gateway = new FetchAuthGateway(
      "https://api.example.test/v1",
      fetchMock,
    );

    await expect(
      gateway.refreshSession("sensitive.refresh.token"),
    ).rejects.toMatchObject({ kind: "unauthorized", status: 401 });
  });

  it("rejects malformed success responses", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: true, payload: {} }), {
        status: 200,
      }),
    );
    const gateway = new FetchAuthGateway(
      "https://api.example.test/v1",
      fetchMock,
    );

    await expect(gateway.refreshSession("refresh.token")).rejects.toMatchObject(
      { kind: "invalid_response" },
    );
  });

  it("accepts an idempotent revocation response", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 204 }));
    const gateway = new FetchAuthGateway(
      "https://api.example.test/v1",
      fetchMock,
    );

    await expect(
      gateway.revokeSession("refresh.token"),
    ).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.test/v1/auth/native/sessions/revoke",
      expect.objectContaining({
        body: JSON.stringify({ refreshToken: "refresh.token" }),
      }),
    );
  });
});
