import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

afterEach(cleanup);

describe("React 17 testing environment", () => {
  it("renders accessible content", () => {
    render(<h1>My Happy Wallet</h1>);

    expect(
      screen.getByRole("heading", { name: "My Happy Wallet" })
    ).toBeInTheDocument();
  });
});
