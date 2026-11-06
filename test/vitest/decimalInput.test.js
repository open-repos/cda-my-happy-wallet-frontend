import { describe, expect, it } from "vitest";
import {
  hundredthsToDecimal,
  normalizeDecimal,
  parseHundredths,
} from "../../src/js/utils/decimalInput";

describe("saisie décimale partagée", () => {
  it.each([
    ["12,50", 1250],
    ["12.50", 1250],
    ["12,5", 1250],
    ["12.5", 1250],
    ["12", 1200],
    ["0,01", 1],
    ["0", 0],
    ["  12,50  ", 1250],
    ["1 200,50", 120050],
    ["1\u00a0200,50", 120050],
    ["1\u202f200.50", 120050],
    ["12 345 678,99", 1234567899],
    ["007", 700],
  ])("%j vaut %i centièmes", (input, expected) => {
    expect(parseHundredths(input)).toBe(expected);
  });

  it("donne la même valeur avec la virgule et le point", () => {
    expect(normalizeDecimal("12,50")).toBe("12.50");
    expect(normalizeDecimal("12.50")).toBe("12.50");
    expect(normalizeDecimal("1 200,5")).toBe("1200.50");
  });

  it.each([
    "",
    "   ",
    "12,5,0",
    "12.5.0",
    "1.200,50",
    "1,200.50",
    "12,",
    ",50",
    "12,505",
    "12 50",
    "1 20,50",
    "12a",
    "abc",
    "1e3",
    "+12",
    "--12",
    "12-",
    "Infinity",
    "0x10",
    null,
    undefined,
  ])("refuse %j", (input) => {
    expect(parseHundredths(input)).toBeNull();
    expect(normalizeDecimal(input)).toBeNull();
  });

  it("refuse le négatif sauf pour un champ signé", () => {
    expect(parseHundredths("-12,50")).toBeNull();
    expect(parseHundredths("-12,50", { signed: true })).toBe(-1250);
    expect(normalizeDecimal("-0,5", { signed: true })).toBe("-0.50");
    expect(parseHundredths("-0", { signed: true })).toBe(0);
  });

  it("garde la précision au centime sans arrondi flottant", () => {
    expect(parseHundredths("0,1")).toBe(10);
    expect(parseHundredths("0,29")).toBe(29);
    expect(parseHundredths("1,15")).toBe(115);
    expect(normalizeDecimal("99999999,99")).toBe("99999999.99");
  });

  it("refuse un montant au-delà des entiers sûrs", () => {
    expect(parseHundredths("900719925474099,99")).toBeNull();
  });

  it("convertit des centièmes en décimal au point", () => {
    expect(hundredthsToDecimal(1250)).toBe("12.50");
    expect(hundredthsToDecimal(5)).toBe("0.05");
    expect(hundredthsToDecimal(-105)).toBe("-1.05");
  });
});
