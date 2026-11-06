import React, { useRef } from "react";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { useHideOnScroll } from "../../src/js/hooks/useHideOnScroll";

afterEach(cleanup);

const Harness = ({ resetKey = "a" }) => {
  const root = useRef(null);
  const away = useHideOnScroll(root, ".scroller", resetKey);
  return (
    <div ref={root}>
      <div className="scroller" data-testid="scroller" />
      <p>{away ? "away" : "shown"}</p>
    </div>
  );
};

const scrollTo = (element, top) => {
  Object.defineProperties(element, {
    scrollTop: { value: top, configurable: true },
    clientHeight: { value: 500, configurable: true },
    scrollHeight: { value: 2000, configurable: true },
  });
  fireEvent.scroll(element);
};

describe("useHideOnScroll", () => {
  it("steps aside while scrolling down and returns when scrolling up", () => {
    render(<Harness />);
    const scroller = screen.getByTestId("scroller");
    scrollTo(scroller, 0);
    scrollTo(scroller, 200);
    expect(screen.getByText("away")).toBeInTheDocument();
    scrollTo(scroller, 120);
    expect(screen.getByText("shown")).toBeInTheDocument();
  });

  it("comes back at the end of the content and on reset", () => {
    const { rerender } = render(<Harness />);
    const scroller = screen.getByTestId("scroller");
    scrollTo(scroller, 0);
    scrollTo(scroller, 300);
    expect(screen.getByText("away")).toBeInTheDocument();
    scrollTo(scroller, 1500);
    expect(screen.getByText("shown")).toBeInTheDocument();
    scrollTo(scroller, 0);
    scrollTo(scroller, 300);
    act(() => rerender(<Harness resetKey="b" />));
    expect(screen.getByText("shown")).toBeInTheDocument();
  });
});
