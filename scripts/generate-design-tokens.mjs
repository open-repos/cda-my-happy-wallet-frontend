import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import prettier from "prettier";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const contractPath = resolve(projectRoot, "design-tokens/tokens.json");
const webOutputPath = resolve(projectRoot, "src/css/design-tokens.css");
const mobileOutputPath = resolve(projectRoot, "mobile/src/design/tokens.ts");
const checkOnly = process.argv.includes("--check");

const requiredColorRoles = [
  "backgroundCanvas",
  "backgroundSurface",
  "textPrimary",
  "textSecondary",
  "textMuted",
  "textInverse",
  "borderSubtle",
  "actionPrimaryBackground",
  "actionPrimaryText",
  "actionSecondaryBackground",
  "actionSecondaryText",
  "actionDangerBackground",
  "actionDangerText",
  "focusRing",
  "statusSuccessText",
  "statusSuccessSurface",
  "statusInfoText",
  "statusInfoSurface",
  "statusWarningText",
  "statusWarningSurface",
  "statusErrorText",
  "statusErrorSurface",
  "navigationBackground",
  "navigationText",
  "fieldBackground",
  "fieldText",
  "fieldBorder",
];

const toKebabCase = (value) =>
  value.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();

const getPath = (source, path) => {
  return path.split(".").reduce((value, key) => value?.[key], source);
};

const resolveValue = (value, contract) => {
  if (typeof value === "string") {
    const alias = value.match(/^\{([^}]+)\}$/);
    if (alias != null) {
      const resolved = getPath(contract, alias[1]);
      if (resolved === undefined) {
        throw new Error(`Unknown token alias: ${value}`);
      }
      return resolveValue(resolved, contract);
    }
  }

  if (Array.isArray(value)) {
    return value.map((entry) => resolveValue(entry, contract));
  }

  if (value != null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [
        key,
        resolveValue(entry, contract),
      ])
    );
  }

  return value;
};

const resolveObject = (value, contract) => resolveValue(value, contract);

const relativeLuminance = (hex) => {
  const channels = hex
    .slice(1)
    .match(/.{2}/g)
    .map((channel) => Number.parseInt(channel, 16) / 255)
    .map((channel) =>
      channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
    );

  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
};

const contrastRatio = (foreground, background) => {
  const values = [
    relativeLuminance(foreground),
    relativeLuminance(background),
  ].sort((left, right) => right - left);
  return (values[0] + 0.05) / (values[1] + 0.05);
};

const validateContract = (contract) => {
  if (contract.meta?.defaultTheme !== "system") {
    throw new Error("The default theme must remain system.");
  }

  for (const themeName of ["light", "dark"]) {
    const colors = resolveObject(contract.themes?.[themeName]?.color, contract);
    for (const role of requiredColorRoles) {
      if (typeof colors?.[role] !== "string") {
        throw new Error(`Missing ${themeName} color role: ${role}`);
      }
    }

    for (const pair of contract.contrastPairs) {
      const foreground = colors[pair.foreground];
      const background = colors[pair.background];
      const ratio = contrastRatio(foreground, background);
      if (ratio < pair.minimum) {
        throw new Error(
          `${themeName} contrast ${pair.foreground}/${
            pair.background
          } is ${ratio.toFixed(2)}, expected ${pair.minimum}`
        );
      }
    }
  }
};

const formatFontFamily = (families) => {
  const genericFamilies = new Set([
    "cursive",
    "fantasy",
    "monospace",
    "sans-serif",
    "serif",
    "system-ui",
    "ui-monospace",
  ]);
  return families
    .map((family) => (genericFamilies.has(family) ? family : `"${family}"`))
    .join(", ");
};

const formatShadow = ({ x, y, blur, spread, color }) =>
  `${x}px ${y}px ${blur}px ${spread}px ${color}`;

const formatCssValue = (group, value) => {
  if (group === "fontFamily") return formatFontFamily(value);
  if (group === "shadow") return formatShadow(value);
  if (["fontSize", "space", "size", "borderWidth", "radius"].includes(group)) {
    return `${value}px`;
  }
  if (group === "duration" || group === "motionDuration") return `${value}ms`;
  return String(value);
};

const primitiveVariable = (group, name) =>
  `--ds-primitive-${toKebabCase(group)}-${toKebabCase(name)}`;

const semanticVariable = (group, name) =>
  group === "color"
    ? `--ds-color-${toKebabCase(name)}`
    : `--ds-${toKebabCase(group)}-${toKebabCase(name)}`;

const formatSharedValue = (group, name, value) => {
  if (group === "typography" && name.endsWith("Family")) {
    return formatCssValue("fontFamily", value);
  }
  if (group === "typography" && name.endsWith("Size")) {
    return formatCssValue("fontSize", value);
  }
  if (
    group === "space" ||
    group === "size" ||
    group === "borderWidth" ||
    group === "radius"
  ) {
    return formatCssValue(group, value);
  }
  if (group === "shadow") return formatCssValue("shadow", value);
  if (group === "motion" && name.startsWith("duration")) {
    return formatCssValue("motionDuration", value);
  }
  return String(value);
};

const renderDeclarations = (entries, indent = "  ") =>
  entries.map(([name, value]) => `${indent}${name}: ${value};`).join("\n");

const themeDeclarations = (theme, contract) => {
  const colors = resolveObject(theme.color, contract);
  return Object.entries(colors).map(([name, value]) => [
    semanticVariable("color", name),
    value,
  ]);
};

const renderWebTokens = (contract) => {
  const primitiveEntries = Object.entries(contract.primitive).flatMap(
    ([group, tokens]) =>
      Object.entries(tokens).map(([name, value]) => [
        primitiveVariable(group, name),
        formatCssValue(group, resolveValue(value, contract)),
      ])
  );
  const sharedEntries = Object.entries(contract.shared).flatMap(
    ([group, tokens]) =>
      Object.entries(tokens).map(([name, value]) => [
        semanticVariable(group, name),
        formatSharedValue(group, name, resolveValue(value, contract)),
      ])
  );
  const lightEntries = themeDeclarations(contract.themes.light, contract);
  const darkEntries = themeDeclarations(contract.themes.dark, contract);
  const legacyEntries = Object.entries(contract.platform.web.legacyAliases).map(
    ([name, path]) => {
      const variable = path.startsWith("theme.color.")
        ? semanticVariable("color", path.replace("theme.color.", ""))
        : primitiveVariable(...path.replace("primitive.", "").split("."));
      return [`--${name}`, `var(${variable})`];
    }
  );

  return `/* Generated from design-tokens/tokens.json. Do not edit directly. */
:root,
:root[data-theme="light"] {
  color-scheme: light;
${renderDeclarations([
  ...primitiveEntries,
  ...sharedEntries,
  ...lightEntries,
  ...legacyEntries,
])}
}

:root[data-theme="dark"] {
  color-scheme: dark;
${renderDeclarations([...darkEntries, ...legacyEntries])}
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme]) {
    color-scheme: dark;
${renderDeclarations([...darkEntries, ...legacyEntries], "    ")}
  }
}

@media (prefers-reduced-motion: reduce) {
  :root {
    --ds-motion-duration-fast: 0ms;
    --ds-motion-duration-normal: 0ms;
  }
}
`;
};

const renderMobileTokens = (contract) => {
  const output = {
    meta: contract.meta,
    primitives: resolveObject(contract.primitive, contract),
    semantic: resolveObject(contract.shared, contract),
    themes: resolveObject(contract.themes, contract),
  };

  return `/* Generated from ../../design-tokens/tokens.json. Do not edit directly. */
export const designTokens = ${JSON.stringify(output, null, 2)} as const;

export const { meta, primitives, semantic, themes } = designTokens;

export type ThemeName = keyof typeof themes;
export type ThemeTokens = (typeof themes)[ThemeName];
`;
};

const ensureOutput = async (path, expected) => {
  if (!checkOnly) {
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, expected, "utf8");
    return;
  }

  const current = await readFile(path, "utf8").catch(() => "");
  if (current !== expected) {
    throw new Error(
      `${path.replace(
        `${projectRoot}/`,
        ""
      )} is stale. Run npm run tokens:generate.`
    );
  }
};

const contract = JSON.parse(await readFile(contractPath, "utf8"));
validateContract(contract);
await ensureOutput(
  webOutputPath,
  prettier.format(renderWebTokens(contract), { parser: "css" })
);
await ensureOutput(
  mobileOutputPath,
  prettier.format(renderMobileTokens(contract), { parser: "typescript" })
);

console.log(
  checkOnly
    ? "Design token adapters are current."
    : "Design token adapters generated."
);
