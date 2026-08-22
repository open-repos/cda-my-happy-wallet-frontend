import { describe, expect, it, vi } from "vitest";

import { PublicAccountError } from "@/src/features/auth/account/PublicAccountGateway";

import { FetchPublicAccountGateway } from "./FetchPublicAccountGateway";

describe("FetchPublicAccountGateway", () => {
  it("normalizes registration fields and keeps the API payload closed", async () => {
    const request = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 201 }));
    const gateway = new FetchPublicAccountGateway(
      "http://api.test/v1/",
      request,
    );

    await gateway.register({
      firstname: " Ada ",
      lastname: " Lovelace ",
      email: " ADA@Example.COM ",
      password: "StrongPass.1",
      confirmpassword: "StrongPass.1",
    });

    expect(request).toHaveBeenCalledWith("http://api.test/v1/users/register", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        firstname: "Ada",
        lastname: "Lovelace",
        email: "ada@example.com",
        password: "StrongPass.1",
        confirmpassword: "StrongPass.1",
      }),
    });
  });

  it("requests reset without exposing account existence", async () => {
    const request = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 201 }));
    const gateway = new FetchPublicAccountGateway(
      "http://api.test/v1",
      request,
    );

    await gateway.requestPasswordReset(" USER@Example.com ");

    const init = request.mock.calls[0]?.[1] as RequestInit;
    expect(JSON.parse(String(init.body))).toEqual({
      email: "user@example.com",
    });
  });

  it("maps network and rate-limit failures", async () => {
    const networkGateway = new FetchPublicAccountGateway(
      "http://api.test/v1",
      vi.fn(async () => {
        throw new Error("offline");
      }),
    );
    await expect(
      networkGateway.requestPasswordReset("user@example.com"),
    ).rejects.toMatchObject({
      kind: "network",
    });

    const limitedGateway = new FetchPublicAccountGateway(
      "http://api.test/v1",
      vi.fn(
        async () =>
          new Response(null, { status: 429, headers: { "Retry-After": "20" } }),
      ),
    );
    await expect(
      limitedGateway.requestPasswordReset("user@example.com"),
    ).rejects.toEqual(new PublicAccountError("rate_limited", 429, 20));
  });
});
