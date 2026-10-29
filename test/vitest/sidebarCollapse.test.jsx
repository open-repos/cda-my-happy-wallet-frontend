import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import Sidebar from "../../src/js/components/SideBar";
import { NAVIGATION_STORAGE_KEY } from "../../src/js/hooks/useNavigationCollapse";

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

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  window.localStorage.clear();
  document.documentElement.removeAttribute("data-navigation");
});

describe("collapsible navigation", () => {
  it("collapses to icons while links keep their accessible names", () => {
    renderSidebar();
    const toggle = screen.getByRole("button", {
      name: "Réduire la navigation",
    });
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    fireEvent.click(toggle);

    expect(
      screen.getByRole("button", { name: "Déplier la navigation" })
    ).toHaveAttribute("aria-expanded", "false");
    expect(document.documentElement).toHaveAttribute(
      "data-navigation",
      "collapsed"
    );
    expect(window.localStorage.getItem(NAVIGATION_STORAGE_KEY)).toBe(
      "collapsed"
    );
    const home = screen.getByRole("link", { name: "Accueil" });
    expect(home).toHaveAttribute("title", "Accueil");
  });

  it("restores the collapsed rail from the previous visit", () => {
    window.localStorage.setItem(NAVIGATION_STORAGE_KEY, "collapsed");
    renderSidebar();
    expect(
      screen.getByRole("button", { name: "Déplier la navigation" })
    ).toBeInTheDocument();
    expect(document.documentElement).toHaveAttribute(
      "data-navigation",
      "collapsed"
    );
  });

  it("expands the rail when the profile is opened from it", () => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn(() => ({
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }))
    );
    window.localStorage.setItem(NAVIGATION_STORAGE_KEY, "collapsed");
    renderSidebar();
    fireEvent.click(screen.getByRole("button", { name: "Afficher le profil" }));
    expect(document.documentElement).not.toHaveAttribute("data-navigation");
    expect(
      screen.getByRole("button", { name: "Se déconnecter" })
    ).toBeVisible();
  });

  it("closes the profile details before collapsing", () => {
    renderSidebar();
    fireEvent.click(screen.getByRole("button", { name: "Afficher le profil" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Réduire la navigation" })
    );
    expect(
      screen.queryByRole("button", { name: "Se déconnecter" })
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Afficher le profil" })
    ).toHaveAttribute("aria-expanded", "false");
  });

  it("removes the rail attribute when the navigation unmounts", () => {
    window.localStorage.setItem(NAVIGATION_STORAGE_KEY, "collapsed");
    const { unmount } = renderSidebar();
    unmount();
    expect(document.documentElement).not.toHaveAttribute("data-navigation");
  });
});
