import { readFile } from "node:fs/promises";

const readJson = async (relativePath) =>
  JSON.parse(await readFile(new URL(`../${relativePath}`, import.meta.url)));

const [packageManifest, expoManifest, easConfiguration] = await Promise.all([
  readJson("package.json"),
  readJson("app.json"),
  readJson("eas.json"),
]);

const errors = [];
const semanticVersionPattern = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
const packageVersion = packageManifest.version;
const applicationVersion = expoManifest.expo?.version;

if (!semanticVersionPattern.test(applicationVersion ?? "")) {
  errors.push("expo.version must be a stable MAJOR.MINOR.PATCH version.");
}

if (packageVersion !== applicationVersion) {
  errors.push(
    `package.json version (${packageVersion}) must match app.json expo.version (${applicationVersion}).`,
  );
}

if (easConfiguration.cli?.appVersionSource !== "remote") {
  errors.push('eas.json must keep cli.appVersionSource set to "remote".');
}

if (easConfiguration.build?.production?.autoIncrement !== true) {
  errors.push(
    "the EAS production profile must auto-increment native build numbers.",
  );
}

if (errors.length > 0) {
  console.error(`Version contract is invalid:\n- ${errors.join("\n- ")}`);
  process.exitCode = 1;
} else {
  console.log(
    `Version contract valid: app ${applicationVersion}, native build numbers managed by EAS.`,
  );
}
