import { expect, it } from "vitest";
import { savingsMoney } from "../../src/js/components/Savings/savingsFormat";
it.each(["EUR", "JPY", "KWD"])(
  "shows the contract's two decimals for %s",
  (currency) => {
    expect(savingsMoney(1234, currency)).toContain("12,34");
    expect(savingsMoney(-1234, currency, true)).toContain("-12,34");
  }
);
