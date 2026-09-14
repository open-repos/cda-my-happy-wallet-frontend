import { describe, expect, it } from "vitest";

import { AuthGatewayError } from "@/src/features/auth/session/AuthGateway";

import { getSignInErrorMessage } from "./getSignInErrorMessage";

describe("getSignInErrorMessage", () => {
  it("keeps invalid credentials generic", () => {
    expect(
      getSignInErrorMessage(new AuthGatewayError("unauthorized", 401)),
    ).toBe("Email ou mot de passe incorrect.");
  });

  it("includes a valid retry delay for rate limiting", () => {
    expect(
      getSignInErrorMessage(new AuthGatewayError("rate_limited", 429, 30)),
    ).toBe("Trop de tentatives. Reessayez dans 30 secondes.");
  });

  it("distinguishes network failures without exposing details", () => {
    expect(getSignInErrorMessage(new AuthGatewayError("network"))).toBe(
      "Connexion au serveur impossible.",
    );
    expect(getSignInErrorMessage(new Error("sensitive details"))).toBe(
      "Une erreur inattendue est survenue.",
    );
  });
});
