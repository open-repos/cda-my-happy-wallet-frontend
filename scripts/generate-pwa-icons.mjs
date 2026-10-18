import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const output = resolve(root, "public/icons");

/** Rasterize the existing repository logo. No network, fonts or new artwork. */
export const generatePwaIcons = async ({ launchOptions = {} } = {}) => {
  const original = await readFile(
    resolve(root, "src/assets/icons/logo.svg"),
    "utf8"
  );
  const inner = original.match(/<svg\b[^>]*>([\s\S]*)<\/svg>/i)?.[1];
  if (!inner) throw new Error("The source logo must contain an SVG root");
  const tokens = JSON.parse(
    await readFile(resolve(root, "design-tokens/tokens.json"), "utf8")
  );
  const background = tokens.primitive.color.green800;
  const svg = (inset) =>
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="${background}"/><svg x="${inset}" y="${inset}" width="${
      512 - 2 * inset
    }" height="${
      512 - 2 * inset
    }" viewBox="0 0 512.008 512.008">${inner}</svg></svg>\n`;
  const normal = svg(64);
  // A 288px square fits inside the maskable safe circle (radius 204.8px).
  const maskable = svg(112);
  await mkdir(output, { recursive: true });
  await writeFile(resolve(output, "pwa.svg"), normal);
  await writeFile(resolve(output, "pwa-maskable.svg"), maskable);
  const browser = await chromium.launch(launchOptions);
  try {
    const page = await browser.newPage();
    for (const [file, size, source] of [
      ["pwa-192.png", 192, normal],
      ["pwa-512.png", 512, normal],
      ["pwa-maskable-512.png", 512, maskable],
      ["apple-touch-icon.png", 180, normal],
    ]) {
      const data = await page.evaluate(
        async ({ source, size }) => {
          const image = new Image();
          image.src = source;
          await image.decode();
          const canvas = document.createElement("canvas");
          canvas.width = size;
          canvas.height = size;
          canvas.getContext("2d").drawImage(image, 0, 0, size, size);
          return canvas.toDataURL("image/png").split(",")[1];
        },
        {
          source: `data:image/svg+xml;base64,${Buffer.from(source).toString(
            "base64"
          )}`,
          size,
        }
      );
      await writeFile(resolve(output, file), Buffer.from(data, "base64"));
    }
  } finally {
    await browser.close();
  }
};

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  await generatePwaIcons();
  console.log(
    "Generated the public PWA and Apple icons from the repository logo."
  );
}
