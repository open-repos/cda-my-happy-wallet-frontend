import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ThemeToggle } from "../../src/js/components/ThemeToggle";
import {
  applyThemePreference,
  readThemePreference,
  resolveTheme,
  THEME_STORAGE_KEY,
} from "../../src/js/design/theme";

const prefersDark = (matches) =>
  vi.fn(() => ({
    matches,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  window.localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
});

describe("theme preference", () => {
  it("defaults to the system preference", () => {
    expect(readThemePreference()).toBe("system");
  });

  it("persists explicit themes and restores system mode", () => {
    applyThemePreference("dark");
    expect(document.documentElement).toHaveAttribute("data-theme", "dark");
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");

    applyThemePreference("system");
    expect(document.documentElement).not.toHaveAttribute("data-theme");
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("system");
  });

  it("resolves the system preference to the device theme", () => {
    expect(resolveTheme("system", prefersDark(true))).toBe("dark");
    expect(resolveTheme("system", prefersDark(false))).toBe("light");
    expect(resolveTheme("system", undefined)).toBe("light");
    expect(resolveTheme("light", prefersDark(true))).toBe("light");
  });
});

describe("theme toggle", () => {
  it("switches the device theme with a labelled sun/moon button", () => {
    vi.stubGlobal("matchMedia", prefersDark(true));
    render(<ThemeToggle />);

    const toggle = screen.getByRole("button", {
      name: "Activer le thème clair",
    });
    expect(toggle.querySelector("[data-icon='sun']")).not.toBeNull();
    fireEvent.click(toggle);

    expect(document.documentElement).toHaveAttribute("data-theme", "light");
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("light");
    const next = screen.getByRole("button", {
      name: "Activer le thème sombre",
    });
    expect(next.querySelector("[data-icon='moon']")).not.toBeNull();
  });

  it("keeps every toggle in sync (menu header and navigation)", () => {
    render(
      <>
        <ThemeToggle />
        <ThemeToggle />
      </>
    );

    fireEvent.click(
      screen.getAllByRole("button", { name: "Activer le thème sombre" })[0]
    );
    expect(document.documentElement).toHaveAttribute("data-theme", "dark");
    expect(
      screen.getAllByRole("button", { name: "Activer le thème clair" })
    ).toHaveLength(2);
  });
});
