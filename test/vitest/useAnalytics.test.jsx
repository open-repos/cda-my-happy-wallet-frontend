import React from "react";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useAnalytics } from "../../src/js/hooks/useAnalytics";
import { analyticsService } from "../../src/js/services/analyticsService";

vi.mock("../../src/js/services/analyticsService", async (importOriginal) => ({
  ...(await importOriginal()),
  analyticsService: { operations: vi.fn() },
}));

const Probe = ({ query, problem = null }) => {
  const state = useAnalytics(query, problem);
  return (
    <p data-testid="probe">
      {state.status}|{state.code ?? ""}|{state.message ?? ""}
    </p>
  );
};

const bucket = (count) => ({ key: "2026-10", count });
const text = () => screen.getByTestId("probe").textContent;

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("useAnalytics", () => {
  it("does not call the API for a locally refused range", () => {
    render(<Probe query={{ groupBy: "day" }} problem="Trop long" />);
    expect(text()).toBe("invalid||Trop long");
    expect(analyticsService.operations).not.toHaveBeenCalled();
  });

  it("separates empty and filled results", async () => {
    analyticsService.operations.mockResolvedValueOnce({ buckets: [bucket(0)] });
    const { rerender } = render(<Probe query={{ groupBy: "month" }} />);
    await waitFor(() => expect(text()).toBe("empty||"));

    analyticsService.operations.mockResolvedValueOnce({ buckets: [bucket(2)] });
    rerender(<Probe query={{ groupBy: "year" }} />);
    await waitFor(() => expect(text()).toBe("success||"));
    expect(analyticsService.operations).toHaveBeenLastCalledWith({
      groupBy: "year",
    });
  });

  it("keeps the business error code", async () => {
    analyticsService.operations.mockRejectedValue({
      response: {
        data: { error: { details: { code: "ANALYTICS_RANGE_TOO_LARGE" } } },
      },
    });
    render(<Probe query={{ groupBy: "category" }} />);
    await waitFor(() =>
      expect(text()).toBe("error|ANALYTICS_RANGE_TOO_LARGE|")
    );
  });

  it("ignores a late answer to a previous query", async () => {
    let resolveFirst;
    analyticsService.operations
      .mockImplementationOnce(
        () => new Promise((resolve) => (resolveFirst = resolve))
      )
      .mockResolvedValueOnce({ buckets: [bucket(0)] });
    const { rerender } = render(<Probe query={{ groupBy: "month" }} />);
    rerender(<Probe query={{ groupBy: "week" }} />);
    await waitFor(() => expect(text()).toBe("empty||"));

    await act(async () => resolveFirst({ buckets: [bucket(3)] }));

    expect(text()).toBe("empty||");
  });
});
