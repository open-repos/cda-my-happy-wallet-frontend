import { expect, it } from "vitest";
import {
  scenarioParams,
  potentialExpiration,
} from "../../src/js/utils/budgetSimulation";
it("requires a known explicit scenario and leaves standard requests unchanged", () => {
  expect(scenarioParams()).toEqual({});
  expect(scenarioParams("standard")).toEqual({});
  expect(scenarioParams("simulation")).toEqual({ scenario: "simulation" });
  expect(() => scenarioParams("global")).toThrow();
});
it.each([
  ["2026-10-31", "2026-11-01"],
  ["2026-12-31", "2027-01-01"],
  ["2028-02-29", "2028-03-01"],
])("expires the complete rule anchored on %s at %s", (date, expected) => {
  expect(potentialExpiration(date)).toBe(expected);
});
it("rejects impossible anchor dates instead of showing a misleading expiry", () =>
  expect(() => potentialExpiration("2026-02-30")).toThrow());
