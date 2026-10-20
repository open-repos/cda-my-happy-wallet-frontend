import React from "react";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import {
  SimulationProvider,
  useSimulation,
} from "../../src/js/components/Simulation/SimulationContext";
afterEach(cleanup);
const Probe = ({ action = async () => {} }) => {
  const state = useSimulation();
  return (
    <>
      <output>{`${state.enabled ? "simulation" : "standard"}:${
        state.revision
      }`}</output>
      <button onClick={() => state.setEnabled(!state.enabled)}>Basculer</button>
      <button onClick={() => state.mutate(action, "Enregistré.")}>Muter</button>
      <p>{state.message}</p>
    </>
  );
};
it("starts standard, never persists the display choice and resets on unmount", () => {
  const spy = vi.spyOn(Storage.prototype, "setItem");
  const { unmount } = render(
    <SimulationProvider>
      <Probe />
    </SimulationProvider>
  );
  expect(screen.getByRole("status")).toHaveTextContent("standard:0");
  fireEvent.click(screen.getByText("Basculer"));
  expect(screen.getByRole("status")).toHaveTextContent("simulation:0");
  expect(spy).not.toHaveBeenCalled();
  unmount();
  render(
    <SimulationProvider>
      <Probe />
    </SimulationProvider>
  );
  expect(screen.getByRole("status")).toHaveTextContent("standard:0");
  spy.mockRestore();
});
it("refreshes after a successful mutation without enabling simulation implicitly", async () => {
  const action = vi.fn().mockResolvedValue(undefined);
  render(
    <SimulationProvider>
      <Probe action={action} />
    </SimulationProvider>
  );
  fireEvent.click(screen.getByText("Muter"));
  await waitFor(() =>
    expect(screen.getByRole("status")).toHaveTextContent("standard:1")
  );
  expect(screen.getByText("Enregistré.")).toBeVisible();
});
it("does not duplicate an in-flight mutation and does not refresh on failure", async () => {
  let fail;
  const action = vi.fn(
    () =>
      new Promise((_, reject) => {
        fail = reject;
      })
  );
  render(
    <SimulationProvider>
      <Probe action={action} />
    </SimulationProvider>
  );
  fireEvent.click(screen.getByText("Muter"));
  fireEvent.click(screen.getByText("Muter"));
  expect(action).toHaveBeenCalledOnce();
  fail(new Error("transport"));
  await waitFor(() =>
    expect(screen.getByText(/n’a pas pu être enregistrée/)).toBeVisible()
  );
  expect(screen.getByRole("status")).toHaveTextContent("standard:0");
});
