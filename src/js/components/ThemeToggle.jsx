import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMoon, faSun } from "@fortawesome/free-solid-svg-icons";
import { useThemePreference } from "../hooks/useThemePreference";

/** One-click light/dark switch; until first use, the device theme applies. */
export const ThemeToggle = ({ className = "theme-toggle" }) => {
  const { theme, choose } = useThemePreference();
  const next = theme === "dark" ? "light" : "dark";
  return (
    <button
      type="button"
      className={className}
      aria-label={
        next === "dark" ? "Activer le thème sombre" : "Activer le thème clair"
      }
      title={next === "dark" ? "Thème sombre" : "Thème clair"}
      onClick={() => choose(next)}
    >
      <FontAwesomeIcon
        icon={next === "dark" ? faMoon : faSun}
        aria-hidden="true"
      />
    </button>
  );
};
