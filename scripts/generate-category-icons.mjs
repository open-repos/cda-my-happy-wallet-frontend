/*
 * Génère `src/assets/category-icons.json` : le tracé SVG de chaque icône de
 * catégorie autorisée par le backend (#84), lu dans les paquets Font Awesome
 * Free du Web. Le fichier est chargé à la demande par le Web : importer les
 * paquets complets dans le bundle coûterait plus de 1 Mo.
 *
 * Usage, depuis la racine du frontend, dépendances installées :
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

if (checkOnly) {
  const current = await readFile(outputPath, "utf8").catch(() => "");
  if (current !== output) {
    console.error(
      "src/assets/category-icons.json is stale: run node scripts/generate-category-icons.mjs"
    );
    process.exit(1);
  }
  console.log("Category icons are up to date.");
} else {
  await writeFile(outputPath, output);
  console.log(
    `src/assets/category-icons.json: ${Object.keys(icons).length} icons`
  );
}
