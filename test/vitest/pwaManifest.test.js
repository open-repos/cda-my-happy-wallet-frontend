import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "../..");
const manifest = JSON.parse(
  readFileSync(resolve(root, "public/manifest.webmanifest"), "utf8")
);
const html = readFileSync(resolve(root, "index.html"), "utf8");
const tokens = JSON.parse(
  readFileSync(resolve(root, "design-tokens/tokens.json"), "utf8")
);
const pngSize = (path) => {
  const image = readFileSync(resolve(root, "public" + path));
  expect(image.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
  return [image.readUInt32BE(16), image.readUInt32BE(20)];
};

describe("PWA installation metadata", () => {
  it("declares a stable, same-origin identity without private start parameters", () => {
    expect(manifest.name).toBe("My Happy Wallet");
    expect(manifest.short_name).toBe("MyHappyWallet");
    expect(manifest.display).toBe("standalone");
    expect(manifest.prefer_related_applications).toBe(false);
    for (const field of ["id", "start_url", "scope"]) {
      expect(manifest[field]).toBe("/");
      const url = new URL(manifest[field], "https://wallet.example.test");
      expect(url.origin).toBe("https://wallet.example.test");
      expect(url.search + url.hash + url.username + url.password).toBe("");
    }
    expect(manifest.lang).toBe("fr");
    expect(manifest.dir).toBe("ltr");
    expect(manifest.theme_color).toBe(tokens.primitive.color.green800);
    expect(manifest.background_color).toBe(tokens.primitive.color.neutral100);
  });

  it("ships usable standard and maskable PNG icons at the declared sizes", () => {
    for (const size of [192, 512]) {
      const icon = manifest.icons.find(
        (item) => item.sizes === `${size}x${size}` && item.purpose === "any"
      );
      expect(icon.type).toBe("image/png");
      expect(pngSize(icon.src)).toEqual([size, size]);
    }
    const maskable = manifest.icons.find((item) => item.purpose === "maskable");
    expect(pngSize(maskable.src)).toEqual([512, 512]);
    expect(pngSize("/icons/apple-touch-icon.png")).toEqual([180, 180]);
    for (const icon of manifest.icons) {
      expect(icon.src).toMatch(/^\/icons\/[a-z0-9-]+\.(png|svg)$/);
      expect(
        readFileSync(resolve(root, "public" + icon.src)).length
      ).toBeGreaterThan(100);
    }
    expect(new Set(manifest.icons.map((icon) => icon.src)).size).toBe(
      manifest.icons.length
    );
  });

  it("links the manifest and Apple fallbacks from a French document", () => {
    // Parse the source rather than depending on the test runner's document language.
    const parsed = new DOMParser().parseFromString(html, "text/html");
    expect(parsed.documentElement.lang).toBe("fr");
    expect(
      parsed.querySelector('link[rel="manifest"]').getAttribute("href")
    ).toBe("/manifest.webmanifest");
    const apple = parsed.querySelector('link[rel="apple-touch-icon"]');
    expect(apple.getAttribute("href")).toBe("/icons/apple-touch-icon.png");
    expect(apple.getAttribute("sizes")).toBe("180x180");
    for (const [name, value] of [
      ["application-name", "My Happy Wallet"],
      ["theme-color", manifest.theme_color],
      ["apple-mobile-web-app-capable", "yes"],
      ["apple-mobile-web-app-title", manifest.short_name],
      ["apple-mobile-web-app-status-bar-style", "default"],
    ])
      expect(
        parsed.querySelector(`meta[name="${name}"]`).getAttribute("content")
      ).toBe(value);
    expect(parsed.querySelector('meta[name="viewport"]').content).toBe(
      "width=device-width, initial-scale=1.0"
    );
  });
});
