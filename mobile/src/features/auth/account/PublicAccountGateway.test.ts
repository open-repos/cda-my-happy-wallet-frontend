import { describe, expect, it } from "vitest";

import {
  getEmailValidationError,
  getRegistrationValidationError,
  normalizeEmail,
} from "./PublicAccountGateway";

describe("public account validation", () => {
  it("normalizes emails without changing the submitted password", () => {
    expect(normalizeEmail("  TEST@Sample.COM ")).toBe("test@sample.com");
  });

  it("rejects malformed email addresses", () => {
    expect(getEmailValidationError("not-an-email")).toBe(
      "Utilisez une adresse email valide.",
    );
  });

  it("enforces the backend password contract and confirmation", () => {
    const baseDraft = {
      firstname: "Ada",
      lastname: "Lovelace",
      email: "ada@example.com",
      password: "StrongPass.1",
      confirmpassword: "StrongPass.1",
    };

    expect(getRegistrationValidationError(baseDraft)).toBeNull();
    expect(
      getRegistrationValidationError({ ...baseDraft, password: "weak" }),
    ).toContain("au moins 8 caractères");
    expect(
      getRegistrationValidationError({
        ...baseDraft,
        confirmpassword: "OtherPass.1",
      }),
    ).toBe("Les mots de passe ne correspondent pas.");
  });
});
