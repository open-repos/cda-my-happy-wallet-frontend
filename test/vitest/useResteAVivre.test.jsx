import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useResteAVivre } from "../../src/js/hooks/useResteAVivre";

const mocks = vi.hoisted(() => ({
  state: {},
}));

vi.mock("react-redux", () => ({
  useSelector: (selector) => selector(mocks.state),
}));

const HookHarness = ({ period }) => {
  const value = useResteAVivre(period);
  return <output>{value}</output>;
};

afterEach(cleanup);

describe("useResteAVivre", () => {
  it("calculates the requested period from store operations", () => {
    mocks.state = {
      operationsFixes: {
        charges: { data: [{ montant: "400" }] },
        revenus: { data: [{ montant: "1000" }] },
      },
    };

    render(<HookHarness period="semaine" />);

    expect(screen.getByText("150")).toBeInTheDocument();
  });

  it("returns zero while operation data is unavailable", () => {
    mocks.state = {
      operationsFixes: {
        charges: { data: null },
        revenus: { data: null },
      },
    };

    render(<HookHarness period="mois" />);

    expect(screen.getByText("0")).toBeInTheDocument();
  });
});
