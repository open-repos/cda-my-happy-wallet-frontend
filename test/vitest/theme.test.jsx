import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import ThemeSelector from "../../src/js/components/ThemeSelector";
import {
  applyThemePreference,
  readThemePreference,
  THEME_STORAGE_KEY,
} from "../../src/js/design/theme";

afterEach(() => {
  cleanup();
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

  it("offers an accessible persisted selector on the profile pilot", () => {
    render(<ThemeSelector />);

    fireEvent.change(screen.getByLabelText("Thème"), {
      target: { value: "light" },
    });

    expect(screen.getByRole("combobox", { name: "Thème" })).toHaveValue(
      "light"
    );
    expect(document.documentElement).toHaveAttribute("data-theme", "light");
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("light");
  });
});
