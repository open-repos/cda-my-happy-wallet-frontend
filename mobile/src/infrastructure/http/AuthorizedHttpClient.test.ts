import { describe, expect, it, vi } from "vitest";

import {
  AuthenticationRequiredError,
  AuthorizedHttpClient,
  AuthorizedSession,
} from "./AuthorizedHttpClient";

const createSession = (
  accessToken: string | null = "current.access.token",
): AuthorizedSession & { refreshAccessToken: ReturnType<typeof vi.fn> } => ({
  getAccessToken: () => accessToken,
  refreshAccessToken: vi.fn().mockResolvedValue("rotated.access.token"),
});

const authorizationHeader = (
  fetchMock: ReturnType<typeof vi.fn>,
  call: number,
) => {
  const init = fetchMock.mock.calls[call]?.[1] as RequestInit;
  return new Headers(init.headers).get("Authorization");
};

describe("AuthorizedHttpClient", () => {
  it("adds the current Bearer token to a protected request", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 200 }));
    const session = createSession();
    const client = new AuthorizedHttpClient(
      "https://api.example.test/v1/",
      session,
      fetchMock,
    );

    await expect(
      client.request("operations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: 42 }),
      }),
    ).resolves.toMatchObject({ status: 200 });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "https://api.example.test/v1/operations",
    );
    expect(authorizationHeader(fetchMock, 0)).toBe(
      "Bearer current.access.token",
    );
    expect(
      new Headers(fetchMock.mock.calls[0]?.[1]?.headers).get("Content-Type"),
    ).toBe("application/json");
  });

  it("rotates once after a 401 and replays with the new token", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(new Response(null, { status: 200 }));
    const session = createSession();
    const client = new AuthorizedHttpClient(
      "https://api.example.test/v1",
      session,
      fetchMock,
    );

    await expect(client.request("/operations")).resolves.toMatchObject({
      status: 200,
    });

    expect(session.refreshAccessToken).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(authorizationHeader(fetchMock, 0)).toBe(
      "Bearer current.access.token",
    );
    expect(authorizationHeader(fetchMock, 1)).toBe(
      "Bearer rotated.access.token",
    );
  });

  it("returns a second 401 without starting another rotation", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 401 }));
    const session = createSession();
    const client = new AuthorizedHttpClient(
      "https://api.example.test/v1",
      session,
      fetchMock,
    );

    await expect(client.request("/operations")).resolves.toMatchObject({
      status: 401,
    });

    expect(session.refreshAccessToken).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("rejects before dispatch when there is no active access token", async () => {
    const fetchMock = vi.fn();
    const client = new AuthorizedHttpClient(
      "https://api.example.test/v1",
      createSession(null),
      fetchMock,
    );

    await expect(client.request("/operations")).rejects.toBeInstanceOf(
      AuthenticationRequiredError,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does not replay when session rotation fails", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 401 }));
    const session = createSession();
    session.refreshAccessToken.mockRejectedValue(new Error("refresh failed"));
    const client = new AuthorizedHttpClient(
      "https://api.example.test/v1",
      session,
      fetchMock,
    );

    await expect(client.request("/operations")).rejects.toThrow(
      "refresh failed",
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
