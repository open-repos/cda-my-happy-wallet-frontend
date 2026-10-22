import { describe, expect, it } from "vitest";
import {
  CHARGE_PERIODS,
  chargePreview,
  chargeBody,
  chargeInitialValues,
  validateCharge,
} from "../../src/js/utils/fixedCharges";
const values = (overrides = {}) => ({
  titre: "Charge",
  montant: "120",
  devise: "EUR",
  periodicite: "MENSUELLE",
  pourcentagePersonnel: "100",
  ...overrides,
});
describe("aperçu de charge : contrat monétaire backend", () => {
  for (const { value, months } of CHARGE_PERIODS)
    for (const share of [100, 50, 40]) {
      it(`${value} à ${share} % conserve le total et arrondit seulement à la fin`, () => {
        const input = values({
          periodicite: value,
          pourcentagePersonnel: String(share),
        });
        expect(chargePreview(input)).toEqual({
          montantPersonnel: ((120 * share) / 100).toFixed(2),
          montantMensuelPersonnel: ((120 * share) / 100 / months).toFixed(2),
        });
        expect(chargeBody(input).montant).toBe(120);
      });
    }
  it("couvre 1 000 €/mois à 40 %, 0 %, 33,33 % et les demi-centimes", () => {
    expect(
      chargePreview(values({ montant: "1000", pourcentagePersonnel: "40" }))
        .montantMensuelPersonnel
    ).toBe("400.00");
    expect(chargePreview(values({ pourcentagePersonnel: "0" }))).toEqual({
      montantPersonnel: "0.00",
      montantMensuelPersonnel: "0.00",
    });
    expect(
      chargePreview(values({ montant: "100", pourcentagePersonnel: "33,33" }))
        .montantPersonnel
    ).toBe("33.33");
    expect(
      chargePreview(
        values({
          montant: "0.11",
          periodicite: "ANNUELLE",
          pourcentagePersonnel: "50",
        })
      )
    ).toEqual({ montantPersonnel: "0.06", montantMensuelPersonnel: "0.00" });
    expect(
      chargePreview(values({ montant: "0.01", pourcentagePersonnel: "50" }))
        .montantMensuelPersonnel
    ).toBe("0.01");
    expect(
      chargePreview(values({ montant: "99999999.99" })).montantPersonnel
    ).toBe("99999999.99");
  });
  it.each(["", "-1", "100.01", "101", "abc", "33.333", "NaN", "Infinity"])(
    "refuse le pourcentage %s",
    (pourcentagePersonnel) => {
      expect(validateCharge(values({ pourcentagePersonnel }))).toHaveProperty(
        "pourcentagePersonnel"
      );
      expect(chargePreview(values({ pourcentagePersonnel }))).toBeNull();
    }
  );
  it.each(["", "0", "-1", "0.001", "100000000", "abc", "1e2"])(
    "refuse le montant %s",
    (montant) => {
      expect(validateCharge(values({ montant }))).toHaveProperty("montant");
      expect(chargePreview(values({ montant }))).toBeNull();
    }
  );
  it("initialise les anciennes charges sans rediviser leur montant", () => {
    expect(
      chargeInitialValues({ titre: "Loyer", montant: "650.00", devise: "EUR" })
    ).toEqual({
      titre: "Loyer",
      montant: "650.00",
      devise: "EUR",
      periodicite: "MENSUELLE",
      pourcentagePersonnel: "100",
    });
  });
});
