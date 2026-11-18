const assert = require("node:assert/strict");
const { test } = require("node:test");
const { readFileSync } = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "../..");
const read = (file) => readFileSync(path.join(root, file), "utf8");
const pinned = (file) =>
  JSON.parse(read(file)).devDependencies["@playwright/test"];

const workflows = [
  ["mobile-quality.yml", "mobile/package.json"],
  ["web-visual.yml", "package.json"],
  ["pwa-policy.yml", "package.json"],
];

for (const [workflow, manifest] of workflows) {
  const source = read(`.github/workflows/${workflow}`);

  test(`${workflow} runs in the Playwright image pinned by ${manifest}`, () => {
    const images = [...source.matchAll(/^\s+image:\s*(\S+)\s*$/gm)].map(
      (match) => match[1]
    );
    assert.deepEqual(images, [
      `mcr.microsoft.com/playwright:v${pinned(manifest)}-noble`,
    ]);
  });

  test(`${workflow} installs no browser or system package at run time`, () => {
    assert.doesNotMatch(source, /playwright install/);
    assert.doesNotMatch(source, /\bapt(-get)?\b/);
  });
}

test("the Web and mobile applications pin the same exact Playwright version", () => {
  assert.match(pinned("package.json"), /^\d+\.\d+\.\d+$/);
  assert.equal(pinned("mobile/package.json"), pinned("package.json"));
});
