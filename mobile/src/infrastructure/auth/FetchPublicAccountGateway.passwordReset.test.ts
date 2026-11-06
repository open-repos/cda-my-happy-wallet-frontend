import { describe, expect, it, vi } from "vitest";

import { PublicAccountError } from "@/src/features/auth/account/PublicAccountGateway";

import { FetchPublicAccountGateway } from "./FetchPublicAccountGateway";

const TOKEN = "0123456789abcdef".repeat(8);

const createGateway = (response: Response | Error) => {
  const request = vi.fn();
  if (response instanceof Error) {
    request.mockRejectedValue(response);
  } else {
    request.mockResolvedValue(response);
  }
  return {
    gateway: new FetchPublicAccountGateway("http://api.test/v1/", request),
    request,
  };
};

describe("FetchPublicAccountGateway password reset", () => {
  it("verifies the token and lets the API set its reset cookie", async () => {
    const { gateway, request } = createGateway(
      new Response(null, { status: 201 }),
    );

    await gateway.verifyPasswordResetToken(TOKEN);

    expect(request).toHaveBeenCalledWith(
      `http://api.test/v1/users/reset-password/${TOKEN}`,
      {
        method: "GET",
        credentials: "include",
        headers: { Accept: "application/json" },
      },
    );
  });

  it("sends the new password with the reset cookie", async () => {
    const { gateway, request } = createGateway(
      new Response(null, { status: 201 }),
    );

    await gateway.setNewPassword("StrongPass.1", "StrongPass.1");

    expect(request).toHaveBeenCalledWith(
      "http://api.test/v1/users/new-password",
      {
        method: "POST",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          password: "StrongPass.1",
          confirmPassword: "StrongPass.1",
        }),
      },
    );
  });

  it("reports an expired or used token as an HTTP 401 failure", async () => {
    const { gateway } = createGateway(new Response(null, { status: 401 }));

    await expect(gateway.verifyPasswordResetToken(TOKEN)).rejects.toEqual(
      new PublicAccountError("http", 401),
    );
  });

  it("reports network failures without the token", async () => {
    const { gateway } = createGateway(new TypeError(`failed ${TOKEN}`));

    const failure = await gateway
      .setNewPassword("StrongPass.1", "StrongPass.1")
      .catch((error: unknown) => error);

    expect(failure).toEqual(new PublicAccountError("network"));
    expect(String((failure as Error).message)).not.toContain(TOKEN);
  });
});
