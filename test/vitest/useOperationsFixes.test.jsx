import React from "react";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useOperationsFixes } from "../../src/js/hooks/useOperationsFixes";

const mocks = vi.hoisted(() => ({
  dispatch: vi.fn(),
  state: {},
}));

vi.mock("react-redux", () => ({
  useDispatch: () => mocks.dispatch,
  useSelector: (selector) => selector(mocks.state),
}));

vi.mock("../../src/js/slices/operationsFixes/operationsFixesSlice", () => ({
  chargesApi: () => ({ type: "operationsFixes/charges" }),
  revenusApi: () => ({ type: "operationsFixes/revenus" }),
}));

const HookHarness = () => {
  const { isEmptyOpFixe, isLoading } = useOperationsFixes();
  return (
    <output>
      {isLoading ? "loading" : "loaded"}:{isEmptyOpFixe ? "empty" : "ready"}
    </output>
  );
};

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("useOperationsFixes", () => {
  it("loads operations and exposes available data", async () => {
    mocks.state = {
      operationsFixes: {
        charges: { data: [{ id: 1 }], isError: false, isSuccess: true },
        revenus: { data: [{ id: 2 }], isError: false, isSuccess: true },
        isLoading: false,
      },
    };

    render(<HookHarness />);

    await waitFor(() => {
      expect(screen.getByText("loaded:ready")).toBeInTheDocument();
    });
    expect(mocks.dispatch).toHaveBeenCalledWith({
      type: "operationsFixes/charges",
    });
    expect(mocks.dispatch).toHaveBeenCalledWith({
      type: "operationsFixes/revenus",
    });
  });

  it("keeps the empty state for empty operation arrays", async () => {
    mocks.state = {
      operationsFixes: {
        charges: { data: [], isError: false, isSuccess: true },
        revenus: { data: [], isError: false, isSuccess: true },
        isLoading: false,
      },
    };

    render(<HookHarness />);

    await waitFor(() => {
      expect(screen.getByText("loaded:empty")).toBeInTheDocument();
    });
  });
});
