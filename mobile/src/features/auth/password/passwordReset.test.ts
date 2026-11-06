import { describe, expect, it } from "vitest";

import { PublicAccountError } from "@/src/features/auth/account/PublicAccountGateway";

import {
  INVALID_RESET_LINK_MESSAGE,
  getNewPasswordValidationError,
  getPasswordResetFailure,
  isPasswordResetToken,
} from "./passwordReset";

const TOKEN = "0123456789abcdef".repeat(8);

describe("isPasswordResetToken", () => {
  it("accepts the backend token format only", () => {
    expect(isPasswordResetToken(TOKEN)).toBe(true);
  });

  it.each([
    undefined,
    "",
    TOKEN.slice(1),
    `${TOKEN}0`,
    TOKEN.toUpperCase(),
    `${TOKEN.slice(1)}g`,
    [TOKEN],
  ])("rejects %j", (value) => {
    expect(isPasswordResetToken(value)).toBe(false);
  });
});

describe("getNewPasswordValidationError", () => {
  it("accepts a strong confirmed password", () => {
    expect(
      getNewPasswordValidationError("StrongPass.1", "StrongPass.1"),
    ).toBeNull();
  });

  it("uses the registration password rule and message", () => {
    expect(getNewPasswordValidationError("weak", "weak")).toBe(
      "Le mot de passe doit contenir au moins 8 caractères, avec une minuscule, une majuscule, un chiffre et un caractère spécial.",
    );
  });

  it("requires a matching confirmation", () => {
    expect(getNewPasswordValidationError("StrongPass.1", "StrongPass.2")).toBe(
      "Les mots de passe ne correspondent pas.",
    );
  });
});

describe("getPasswordResetFailure", () => {
  it.each([401, 403, 404])(
    "treats HTTP %i as an expired or used link",
    (status) => {
      expect(
        getPasswordResetFailure(new PublicAccountError("http", status)),
      ).toEqual({ kind: "invalid-link" });
    },
  );

  it("keeps a retryable message for network failures", () => {
    expect(getPasswordResetFailure(new PublicAccountError("network"))).toEqual({
      kind: "retryable",
      message:
        "Le service est momentanément inaccessible. Vérifiez votre connexion puis réessayez.",
    });
  });

  it("keeps a retryable message for rate limiting and server errors", () => {
    expect(
      getPasswordResetFailure(new PublicAccountError("rate_limited", 429, 30)),
    ).toEqual({
      kind: "retryable",
      message: "Trop de tentatives. Réessayez dans 30 secondes.",
    });
    expect(
      getPasswordResetFailure(new PublicAccountError("http", 500)).kind,
    ).toBe("retryable");
  });

  it("explains how to recover from an invalid link", () => {
    expect(INVALID_RESET_LINK_MESSAGE).toMatch(/nouveau lien/);
  });
});
