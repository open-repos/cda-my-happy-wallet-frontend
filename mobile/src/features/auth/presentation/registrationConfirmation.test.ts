import { describe, expect, it } from "vitest";

import { getRegistrationConfirmationFeedback } from "./registrationConfirmation";

describe("getRegistrationConfirmationFeedback", () => {
  it("announces a confirmed account with the Web wording", () => {
    expect(getRegistrationConfirmationFeedback("confirmed")).toEqual({
      kind: "success",
      message: "Votre compte a bien été créé !",
    });
  });

  it("explains an already used link like the Web", () => {
    expect(getRegistrationConfirmationFeedback("already-used")).toEqual({
      kind: "error",
      message:
        "Ce lien de confirmation a déjà été utilisé. Vous pouvez vous connecter.",
    });
  });

  it("explains an invalid or expired link like the Web", () => {
    expect(getRegistrationConfirmationFeedback("invalid-or-expired")).toEqual({
      kind: "error",
      message:
        "Ce lien de confirmation est invalide ou a expiré. Recommencez l’inscription pour recevoir un nouveau lien.",
    });
  });

  it.each([undefined, "", "bogus", ["already-used"], "toString"])(
    "ignores %j",
    (value) => {
      expect(getRegistrationConfirmationFeedback(value)).toBeNull();
    },
  );
});
