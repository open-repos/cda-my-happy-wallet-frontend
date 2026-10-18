/*
 * Génère, depuis la liste autorisée par le backend (#84) :
 * - `src/assets/category-icons.json` : le tracé SVG de chaque icône, lu dans
 *   les paquets Font Awesome Free du Web et chargé à la demande (importer les
 *   paquets complets dans le bundle coûterait plus de 1 Mo) ;
 * - `mobile/src/features/categories/domain/categoryIcons.json` : les seuls
 *   noms et les suggestions françaises du Web, pour le mobile qui dessine les
 *   icônes avec la police `FontAwesome6` de `@expo/vector-icons` (#132).
 *
 * Usage, depuis la racine du frontend, `npm ci` fait à la racine et dans
 * `mobile/` (Prettier du mobile utilisé pour sa sortie) :
 *   node scripts/generate-category-icons.mjs [--allowlist <fichier>] [--check]
 *
 * `--allowlist` désigne le `categoryIcons.json` du backend (par défaut dans le
 * checkout voisin `../my-happy-wallet-backend`). `--check` échoue si le
 * fichier versionné diffère du résultat.
 */
import { readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputPath = resolve(projectRoot, "src/assets/category-icons.json");
const mobileOutputPath = resolve(
  projectRoot,
  "mobile/src/features/categories/domain/categoryIcons.json"
);
const require = createRequire(import.meta.url);

const argument = (name, fallback) => {
  const index = process.argv.indexOf(name);
  return index === -1 ? fallback : process.argv[index + 1];
};
const allowlistPath = resolve(
  argument(
    "--allowlist",
    resolve(
      projectRoot,
      "../my-happy-wallet-backend/src/modules/operations/domain/categoryIcons.json"
    )
  )
);
const checkOnly = process.argv.includes("--check");

const readJson = async (path) => JSON.parse(await readFile(path, "utf8"));
const allowlist = await readJson(allowlistPath);

const packs = {
  solid: {
    name: "@fortawesome/free-solid-svg-icons",
    icons: require("@fortawesome/free-solid-svg-icons").fas,
  },
  regular: {
    name: "@fortawesome/free-regular-svg-icons",
    icons: require("@fortawesome/free-regular-svg-icons").far,
  },
};

const icons = {};
for (const [style, pack] of Object.entries(packs)) {
  const byName = new Map(
    Object.values(pack.icons).map((definition) => [
      definition.iconName,
      definition,
    ])
  );
  for (const name of allowlist[style]) {
    const definition = byName.get(name);
    if (!definition) {
      throw new Error(
        `${style}:${name} is allowed but missing from ${pack.name}`
      );
    }
    const [width, height, , , path] = definition.icon;
    icons[`${style}:${name}`] = [
      width,
      height,
      Array.isArray(path) ? path.join(" ") : path,
    ];
  }
}

// Le paquet n'exporte pas `package.json` : lecture à côté de son entrée.
const version = async (packageName) =>
  (
    await readJson(
      resolve(dirname(require.resolve(packageName)), "package.json")
    )
  ).version;
const header = {
  allowlistGeneratedAt: allowlist.generatedAt,
  generator: "scripts/generate-category-icons.mjs",
  sources: {
    allowlist:
      "my-happy-wallet-backend/src/modules/operations/domain/categoryIcons.json",
    [packs.solid.name]: await version(packs.solid.name),
    [packs.regular.name]: await version(packs.regular.name),
  },
  attribution:
    "Font Awesome Free by @fontawesome - https://fontawesome.com - Icons: CC BY 4.0 License (https://fontawesome.com/license/free)",
};

// Une icône par ligne : les régénérations restent lisibles dans un diff.
const body = Object.keys(icons)
  .sort()
  .map((key) => `    ${JSON.stringify(key)}: ${JSON.stringify(icons[key])}`)
  .join(",\n");
const headerLines = Object.entries(header)
  .map(([key, value]) => `  ${JSON.stringify(key)}: ${JSON.stringify(value)}`)
  .join(",\n");
const output = `{\n${headerLines},\n  "icons": {\n${body}\n  }\n}\n`;

// Suggestions françaises : source unique dans le module Web. Le dépôt n'est
// pas déclaré `"type": "module"` : Node signale MODULE_TYPELESS_PACKAGE_JSON
// en important ce module ESM, sans effet sur le résultat.
const { SUGGESTED_ICONS } = await import(
  resolve(projectRoot, "src/js/utils/categoryIcons.js")
);
// Formaté par le Prettier du mobile (version et configuration propres) :
// le fichier généré passe tel quel `npm run format` du mobile.
const mobilePrettier = createRequire(
  resolve(projectRoot, "mobile/package.json")
)("prettier");
const mobileOutput = await mobilePrettier.format(
  JSON.stringify({
    allowlistGeneratedAt: allowlist.generatedAt,
    generator: header.generator,
    icons: Object.keys(icons).sort(),
    suggestions: SUGGESTED_ICONS.filter(({ icon }) => icon in icons),
  }),
  {
    ...(await mobilePrettier.resolveConfig(mobileOutputPath)),
    filepath: mobileOutputPath,
  }
);

const outputs = [
  [outputPath, output],
  [mobileOutputPath, mobileOutput],
];
if (checkOnly) {
  for (const [path, content] of outputs) {
    const current = await readFile(path, "utf8").catch(() => "");
    if (current !== content) {
      console.error(
        `${path} is stale: run node scripts/generate-category-icons.mjs`
      );
      process.exit(1);
    }
  }
  console.log("Category icons are up to date.");
} else {
  for (const [path, content] of outputs) await writeFile(path, content);
  console.log(
    `category icons: ${
      Object.keys(icons).length
    } icons (Web paths and mobile names)`
  );
}
