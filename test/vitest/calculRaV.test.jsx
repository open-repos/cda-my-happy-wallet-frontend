import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import CalculRaV from "../../src/js/components/CalculRaV";

const mocks = vi.hoisted(() => ({
  useResteAVivre: vi.fn(),
}));

vi.mock("../../src/js/hooks/useResteAVivre", () => ({
  useResteAVivre: mocks.useResteAVivre,
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("CalculRaV", () => {
  it("renders and reports the reste à vivre for the selected period", () => {
    const onCalculated = vi.fn();
    mocks.useResteAVivre.mockReturnValue(125.5);

    render(<CalculRaV calculRaV={onCalculated} period="semaine" />);

    expect(screen.getByRole("heading")).toHaveTextContent(
      "Votre reste à vivre est de : 125.5 par semaine"
    );
    expect(mocks.useResteAVivre).toHaveBeenCalledWith("semaine");
    expect(onCalculated).toHaveBeenCalledWith(125.5);
  });

  it("renders without a calculation callback", () => {
    mocks.useResteAVivre.mockReturnValue(0);

    render(<CalculRaV period="mois" />);

    expect(screen.getByRole("heading")).toHaveTextContent(
      "Votre reste à vivre est de : 0 par mois"
    );
  });
});
