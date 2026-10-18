import { useEffect, useState } from "react";

/** Tokens du design system transmis au canvas, qui ne lit pas les variables CSS. */
const TOKENS = {
  text: "--ds-color-text-primary",
  muted: "--ds-color-text-secondary",
  grid: "--ds-color-border-subtle",
  expense: "--ds-color-data-expense",
  income: "--ds-color-data-income",
  forecast: "--ds-color-data-forecast",
  surface: "--ds-color-background-surface",
  font: "--ds-typography-body-family",
};

/** Palette des catégories sans couleur propre (#172). */
const CATEGORY_TOKENS = [1, 2, 3, 4, 5, 6].map(
  (rank) => `--ds-color-data-category${rank}`
);

/** Toute la palette ou rien : un token manquant décalerait les rangs. */
const categoryPalette = (style) => {
  const colors = CATEGORY_TOKENS.map((name) =>
    style.getPropertyValue(name).trim()
  );
  return colors.every(Boolean) ? colors : [];
};

export const readChartTokens = (root = document.documentElement) => {
  const style = window.getComputedStyle(root);
  return {
    ...Object.fromEntries(
      Object.entries(TOKENS).map(([key, name]) => [
        key,
        style.getPropertyValue(name).trim(),
      ])
    ),
    categories: categoryPalette(style),
    reducedMotion:
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false,
  };
};

/** Relit les tokens quand le thème ou la préférence de mouvement change. */
export const useChartTokens = () => {
  const [tokens, setTokens] = useState(readChartTokens);

  useEffect(() => {
    const refresh = () => setTokens(readChartTokens());
    const observer = new MutationObserver(refresh);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    const queries = [
      "(prefers-color-scheme: dark)",
      "(prefers-reduced-motion: reduce)",
    ].map((query) => window.matchMedia?.(query));
    queries.forEach((media) => media?.addEventListener?.("change", refresh));
    return () => {
      observer.disconnect();
      queries.forEach((media) =>
        media?.removeEventListener?.("change", refresh)
      );
    };
  }, []);

  return tokens;
};
