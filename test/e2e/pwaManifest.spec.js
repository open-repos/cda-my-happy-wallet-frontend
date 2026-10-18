import { expect, test } from "@playwright/test";
import { prepareProtectedPage } from "../visual/fixtures.mjs";

for (const viewport of [
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 1440, height: 900 },
]) {
  test(`publishes the installation identity and usable icons at ${viewport.width}px`, async ({
    page,
    context,
  }) => {
    await page.setViewportSize(viewport);
    await prepareProtectedPage(page, { authenticated: false });
    await page.goto("/login");
    await expect(page.locator("html")).toHaveAttribute("lang", "fr");
    await expect(page.locator('link[rel="manifest"]')).toHaveAttribute(
      "href",
      "/manifest.webmanifest"
    );
    const cdp = await context.newCDPSession(page);
    const parsed = await cdp.send("Page.getAppManifest");
    expect(parsed.errors).toEqual([]);
    const manifest = JSON.parse(parsed.data);
    expect(manifest.id).toBe("/");
    expect(manifest.start_url).toBe("/");
    expect(manifest.scope).toBe("/");
    expect(manifest.display).toBe("standalone");

    const icons = await page.evaluate(async (manifest) => {
      const results = [];
      for (const icon of [
        ...manifest.icons,
        {
          src: "/icons/apple-touch-icon.png",
          sizes: "180x180",
          purpose: "apple",
        },
      ]) {
        const image = new Image();
        image.src = icon.src;
        await image.decode();
        const canvas = document.createElement("canvas");
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(image, 0, 0);
        const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        let transparent = 0,
          outsideSafeArea = 0,
          artwork = 0;
        for (let y = 0; y < canvas.height; y += 1)
          for (let x = 0; x < canvas.width; x += 1) {
            const i = 4 * (y * canvas.width + x);
            if (pixels[i + 3] !== 255) transparent += 1;
            const background =
              pixels[i] === 7 && pixels[i + 1] === 94 && pixels[i + 2] === 59;
            if (!background) artwork += 1;
            if (
              !background &&
              Math.hypot(
                x + 0.5 - canvas.width / 2,
                y + 0.5 - canvas.height / 2
              ) >
                canvas.width * 0.4
            )
              outsideSafeArea += 1;
          }
        results.push({
          ...icon,
          width: canvas.width,
          height: canvas.height,
          transparent,
          outsideSafeArea,
          artwork,
        });
      }
      return results;
    }, manifest);
    for (const icon of icons) {
      expect(icon.transparent, icon.src).toBe(0);
      expect(icon.artwork, icon.src).toBeGreaterThan(
        icon.width * icon.height * 0.02
      );
      if (icon.sizes !== "any")
        expect(`${icon.width}x${icon.height}`, icon.src).toBe(icon.sizes);
      if (icon.purpose === "maskable") expect(icon.outsideSafeArea).toBe(0);
    }
    expect(
      await page.evaluate(() =>
        navigator.serviceWorker.getRegistrations().then((items) => items.length)
      )
    ).toBe(0);
    await cdp.detach();
  });
}
