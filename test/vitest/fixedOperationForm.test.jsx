import React from "react";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FormCardOperationFixe } from "../../src/js/components/FormOperationFixe/FormCardOperationFixe";

const mocks = vi.hoisted(() => ({
  dispatch: vi.fn(),
}));

vi.mock("react-redux", () => ({
  useDispatch: () => mocks.dispatch,
}));

vi.mock(
  "../../src/js/slices/operationsFixes/operationsFixesSlice",
  () => ({
    addChargesApi: (payload) => ({
      type: "operationsFixes/addCharges",
      payload,
    }),
    addRevenusApi: (payload) => ({
      type: "operationsFixes/addRevenus",
      payload,
    }),
  })
);

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const fillForm = ({ title, amount, currency = "EUR" }) => {
  fireEvent.change(screen.getByLabelText("Titre"), {
    target: { value: title },
  });
  fireEvent.change(screen.getByLabelText("Montant"), {
    target: { value: amount },
  });
  fireEvent.change(screen.getByRole("combobox"), {
    target: { value: currency },
  });
};

describe("FormCardOperationFixe", () => {
  it("rejects an empty operation", async () => {
    render(<FormCardOperationFixe typeOpFixe="charges" />);

    fireEvent.click(screen.getByRole("button", { name: "Ok" }));

    await waitFor(() => {
      expect(screen.getAllByText("Requis")).toHaveLength(2);
    });
    expect(mocks.dispatch).not.toHaveBeenCalled();
  });

  it("dispatches a charge", async () => {
    render(<FormCardOperationFixe typeOpFixe="charges" />);
    fillForm({ title: "Loyer", amount: "850" });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Ok" })).toBeEnabled();
    });
    fireEvent.click(screen.getByRole("button", { name: "Ok" }));

    await waitFor(() => {
      expect(mocks.dispatch).toHaveBeenCalledWith({
        type: "operationsFixes/addCharges",
        payload: { titre: "Loyer", montant: 850, devise: "EUR" },
      });
    });
  });

  it("dispatches a revenue", async () => {
    render(<FormCardOperationFixe typeOpFixe="revenus" />);
    fillForm({ title: "Salaire", amount: "2500", currency: "USD" });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Ok" })).toBeEnabled();
    });
    fireEvent.click(screen.getByRole("button", { name: "Ok" }));

    await waitFor(() => {
      expect(mocks.dispatch).toHaveBeenCalledWith({
        type: "operationsFixes/addRevenus",
        payload: { titre: "Salaire", montant: 2500, devise: "USD" },
      });
    });
  });
});
