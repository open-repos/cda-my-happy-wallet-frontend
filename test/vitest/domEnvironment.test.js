import { describe, expect, it } from "vitest";

describe("Vitest DOM environment", () => {
  it("provides a browser document", () => {
    const element = document.createElement("div");
    element.textContent = "My Happy Wallet";

    expect(element.textContent).toBe("My Happy Wallet");
  });
});
