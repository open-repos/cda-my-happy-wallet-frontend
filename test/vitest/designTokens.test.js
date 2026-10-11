import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const projectPath = (path) => resolve(process.cwd(), path);
const contract = JSON.parse(
  readFileSync(projectPath("design-tokens/tokens.json"), "utf8")
);
const webAdapter = readFileSync(
  projectPath("src/css/design-tokens.css"),
  "utf8"
);

describe("design token contract", () => {
  it("defines the supported themes and system default", () => {
    expect(contract.meta.defaultTheme).toBe("system");
    expect(Object.keys(contract.themes)).toEqual(["light", "dark"]);
    expect(contract.themes.light.color.backgroundCanvas).not.toBe(
      contract.themes.dark.color.backgroundCanvas
    );
  });

  it("exports semantic CSS roles and legacy aliases", () => {
    expect(webAdapter).toContain("--ds-color-text-primary:");
    expect(webAdapter).toContain("--ds-color-status-error-surface:");
    expect(webAdapter).toContain(':root[data-theme="dark"]');
    expect(webAdapter).toContain(
      "--orange: var(--ds-primitive-color-coral500)"
    );
  });

  it("paints the legacy shell with the colour checked by its contrast pairs", () => {
    // `--background` peint body; les rôles « sur coque » sont contrôlés contre
    // `backgroundShell` : les deux doivent rester la même couleur.
    for (const theme of Object.values(contract.themes)) {
      // Les rôles s'écrivent `{chemin}`, les alias historiques `chemin`.
      expect(theme.color.backgroundShell.replace(/^\{|\}$/g, "")).toBe(
        contract.platform.web.legacyAliases.background
      );
      // La barre latérale est peinte avec l'alias `--dark-secondary-color`.
      expect(theme.color.backgroundSidebar.replace(/^\{|\}$/g, "")).toBe(
        contract.platform.web.legacyAliases["dark-secondary-color"]
      );
    }
    expect(contract.contrastPairs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          foreground: "textOnShell",
          background: "backgroundShell",
        }),
        expect.objectContaining({
          foreground: "textOnShellMuted",
          background: "backgroundShell",
        }),
        expect.objectContaining({
          foreground: "focusRingOnShell",
          background: "backgroundShell",
          minimum: 3,
        }),
        expect.objectContaining({
          foreground: "focusRingOnShell",
          background: "backgroundSidebar",
          minimum: 3,
        }),
      ])
    );
  });

  it("does not persist temporary Figma asset URLs", () => {
    expect(JSON.stringify(contract)).not.toContain("figma.com/api/mcp/asset");
    expect(webAdapter).not.toContain("figma.com/api/mcp/asset");
  });
});
