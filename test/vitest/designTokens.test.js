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

  it("does not persist temporary Figma asset URLs", () => {
    expect(JSON.stringify(contract)).not.toContain("figma.com/api/mcp/asset");
    expect(webAdapter).not.toContain("figma.com/api/mcp/asset");
  });
});
