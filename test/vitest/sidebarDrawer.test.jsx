import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { act } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import Sidebar from "../../src/js/components/SideBar";

vi.mock("react-redux", () => ({
  useSelector: (select) =>
    select({
      auth: {
        user: { payload: { user: { firstname: "Happy", lastname: "Wallet" } } },
      },
    }),
  useDispatch: () => vi.fn(),
}));

const renderSidebar = () =>
  render(
    <MemoryRouter initialEntries={["/home"]}>
      <Sidebar />
    </MemoryRouter>
  );

const menuButton = () => screen.getByRole("button", { name: /le menu$/ });

afterEach(cleanup);

describe("Sidebar drawer", () => {
  it("exposes an accessible menu button controlling the navigation", () => {
    renderSidebar();

    const button = menuButton();
    expect(button).toHaveAccessibleName("Ouvrir le menu");
    expect(button).toHaveAttribute("aria-expanded", "false");
    const navigation = screen.getByRole("navigation", {
      name: "Navigation principale",
    });
    expect(button).toHaveAttribute("aria-controls", navigation.id);
    expect(navigation).toHaveAttribute("data-open", "false");

    fireEvent.click(button);

    expect(button).toHaveAccessibleName("Fermer le menu");
    expect(button).toHaveAttribute("aria-expanded", "true");
    expect(navigation).toHaveAttribute("data-open", "true");
  });

  it("closes on Escape and gives the focus back to the menu button", () => {
    renderSidebar();
    fireEvent.click(menuButton());

    fireEvent.keyDown(document, { key: "Escape" });

    expect(menuButton()).toHaveAttribute("aria-expanded", "false");
    expect(menuButton()).toHaveFocus();
  });

  it("closes when a destination or the backdrop is chosen", () => {
    renderSidebar();
    fireEvent.click(menuButton());
    fireEvent.click(screen.getByRole("link", { name: /Analyses/ }));
    expect(menuButton()).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(menuButton());
    fireEvent.click(screen.getByTestId("sidebar-backdrop"));
    expect(menuButton()).toHaveAttribute("aria-expanded", "false");
    expect(menuButton()).toHaveFocus();
  });

  it("closes when the viewport leaves or enters the mobile layout", () => {
    const listeners = [];
    const original = window.matchMedia;
    window.matchMedia = vi.fn(() => ({
      matches: true,
      addEventListener: (_, listener) => listeners.push(listener),
      removeEventListener: vi.fn(),
    }));
    try {
      renderSidebar();
      fireEvent.click(menuButton());
      expect(menuButton()).toHaveAttribute("aria-expanded", "true");

      act(() => listeners.forEach((listener) => listener({ matches: false })));

      expect(menuButton()).toHaveAttribute("aria-expanded", "false");
    } finally {
      window.matchMedia = original;
    }
  });
});
