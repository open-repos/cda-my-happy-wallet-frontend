import React from "react";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EChart } from "../../src/js/components/charts/EChart";
import { echarts } from "../../src/js/components/charts/echarts";

const instance = vi.hoisted(() => ({
  setOption: vi.fn(),
  resize: vi.fn(),
  dispose: vi.fn(),
}));

vi.mock("../../src/js/components/charts/echarts", () => ({
  echarts: { init: vi.fn(() => instance) },
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("EChart", () => {
  it("renders an accessible container, applies options and disposes", async () => {
    const first = { series: [{ type: "bar" }] };
    const second = { series: [{ type: "pie" }] };
    const { rerender, unmount } = render(
      <EChart option={first} label="Dépenses" />
    );

    const container = screen.getByRole("img", { name: "Dépenses" });
    await waitFor(() => expect(echarts.init).toHaveBeenCalledTimes(1));
    expect(echarts.init).toHaveBeenCalledWith(container, null, {
      renderer: "canvas",
    });
    expect(instance.setOption).toHaveBeenLastCalledWith(first, {
      notMerge: true,
    });

    rerender(<EChart option={second} label="Dépenses" />);
    expect(instance.setOption).toHaveBeenLastCalledWith(second, {
      notMerge: true,
    });
    expect(echarts.init).toHaveBeenCalledTimes(1);

    unmount();
    expect(instance.dispose).toHaveBeenCalledTimes(1);
  });

  it("never creates a chart once unmounted before ECharts loaded", async () => {
    const { unmount } = render(<EChart option={{ series: [] }} label="Vide" />);
    unmount();

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(echarts.init).not.toHaveBeenCalled();
  });
});
