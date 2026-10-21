import React from "react";
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useDispatch, useSelector } from "react-redux";
import ListOperationsFIxes from "../../src/js/components/OperationsFixes/ListOperationsFIxes";

// L'avertissement defaultProps de react-fontawesome 0.1 est traité à part :
// ce test vérifie le composant et son tableau (#211).
vi.mock("@fortawesome/react-fontawesome", () => ({
  FontAwesomeIcon: () => <svg aria-hidden="true" />,
}));
vi.mock("react-redux", () => ({
  useDispatch: vi.fn(),
  useSelector: vi.fn(),
}));

const loaded = (data) => ({ data, isError: false, isSuccess: true });
const charge = {
  idOperationFixe: 7,
  titre: "Loyer",
  montant: "650.00",
  devise: "EUR",
};

beforeEach(() => {
  useDispatch.mockReturnValue(vi.fn());
  useSelector.mockImplementation((select) =>
    select({
      operationsFixes: {
        charges: loaded([charge]),
        revenus: loaded([]),
        isLoading: false,
      },
    })
  );
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("ListOperationsFIxes (#211)", () => {
  // En premier : React n'émet chaque avertissement qu'une fois par processus.
  it("renders without React warnings", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    render(<ListOperationsFIxes typeOpFixe="charges" />);
    expect(error).not.toHaveBeenCalled();
  });

  it("lists fixed operations in a plain table", () => {
    const { container } = render(<ListOperationsFIxes typeOpFixe="charges" />);

    const table = screen.getByRole("table");
    expect(table).toHaveClass("table-opfixe");
    expect(container.querySelector(".liste-opfixe")).toContainElement(table);
    expect(
      within(table)
        .getAllByRole("columnheader")
        .map((cell) => cell.textContent.trim())
    ).toEqual(["Titre", "Montant", "Devise", ""]);
    const row = within(table).getByText("Loyer").closest("tr");
    expect(row).toHaveTextContent("650.00");
    expect(row).toHaveTextContent("EUR");
  });
});
