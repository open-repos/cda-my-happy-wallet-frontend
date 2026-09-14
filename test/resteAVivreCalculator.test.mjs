import assert from "assert";
import {
  calculateResteAVivre,
  getDaysInMonth,
} from "../src/js/utils/resteAVivreCalculator.mjs";

const charges = [{ montant: "600" }, { montant: 150 }];
const revenus = [{ montant: "2000" }, { montant: 300 }];

assert.strictEqual(
  calculateResteAVivre({
    charges,
    revenus,
    period: "mois",
  }),
  1550
);

assert.strictEqual(
  calculateResteAVivre({
    charges,
    revenus,
    period: "semaine",
  }),
  387.5
);

assert.strictEqual(
  calculateResteAVivre({
    charges,
    revenus,
    period: "jour",
    date: new Date("2026-06-10T00:00:00.000Z"),
  }),
  50
);

assert.strictEqual(
  calculateResteAVivre({
    charges: [],
    revenus: [],
    period: "mois",
  }),
  0
);

assert.strictEqual(
  calculateResteAVivre({
    charges,
    revenus,
    period: "annee",
  }),
  0
);

assert.strictEqual(getDaysInMonth(6, 2026), 30);
