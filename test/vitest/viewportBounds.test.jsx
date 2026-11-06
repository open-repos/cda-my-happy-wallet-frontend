import React from "react";
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { useViewportBounds } from "../../src/js/hooks/useViewportBounds";

const original = Object.getOwnPropertyDescriptor(window, "visualViewport");
afterEach(() => {
  cleanup();
  if (original) Object.defineProperty(window, "visualViewport", original);
  else delete window.visualViewport;
});
const Probe = () => <div data-testid="viewport" style={useViewportBounds()} />;

it("follows keyboard resize and panning, then removes viewport listeners", () => {
  const viewport = Object.assign(new EventTarget(), {
    height: 800,
    offsetTop: 0,
  });
  const remove = vi.spyOn(viewport, "removeEventListener");
  Object.defineProperty(window, "visualViewport", {
    configurable: true,
    value: viewport,
  });
  const { unmount } = render(<Probe />);
  act(() => {
    viewport.height = 380;
    viewport.offsetTop = 24;
    viewport.dispatchEvent(new Event("resize"));
    viewport.dispatchEvent(new Event("scroll"));
  });
  expect(
    screen
      .getByTestId("viewport")
      .style.getPropertyValue("--quick-add-viewport-height")
  ).toBe("380px");
  expect(
    screen
      .getByTestId("viewport")
      .style.getPropertyValue("--quick-add-viewport-top")
  ).toBe("24px");
  unmount();
  expect(remove).toHaveBeenCalledWith("resize", expect.any(Function));
  expect(remove).toHaveBeenCalledWith("scroll", expect.any(Function));
});

it("uses the window height when VisualViewport is unavailable", () => {
  Object.defineProperty(window, "visualViewport", {
    configurable: true,
    value: undefined,
  });
  render(<Probe />);
  expect(
    screen
      .getByTestId("viewport")
      .style.getPropertyValue("--quick-add-viewport-height")
  ).toBe(`${window.innerHeight}px`);
});
