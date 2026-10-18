import { describe, expect, it } from "vitest";

import tokens from "../../design-tokens/tokens.json";
import { CATEGORY_PALETTE as PICKER } from "../../src/js/utils/categoryForm";

const resolve = (value) =>
  value.startsWith("{")
    ? value
        .slice(1, -1)
        .split(".")
        .reduce((node, key) => node[key], tokens)
    : value;

const linear = (channel) =>
  channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;

const toLab = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) =>
    linear(parseInt(hex.slice(i, i + 2), 16) / 255)
  );
  const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const x = f((0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047);
  const y = f(0.2126 * r + 0.7152 * g + 0.0722 * b);
  const z = f((0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883);
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
};

const rad = (deg) => (deg * Math.PI) / 180;
const hue = (b, a) => ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360;

/** Écart perçu CIEDE2000 entre deux couleurs hexadécimales. */
const deltaE = (left, right) => {
  const [l1, a1, b1] = toLab(left);
  const [l2, a2, b2] = toLab(right);
  const c = (Math.hypot(a1, b1) + Math.hypot(a2, b2)) / 2;
  const g = 0.5 * (1 - Math.sqrt(c ** 7 / (c ** 7 + 25 ** 7)));
  const [p1, p2] = [(1 + g) * a1, (1 + g) * a2];
  const [c1, c2] = [Math.hypot(p1, b1), Math.hypot(p2, b2)];
  const [h1, h2] = [hue(b1, p1), hue(b2, p2)];
  let dh = h2 - h1;
  if (c1 * c2 === 0) dh = 0;
  else if (dh > 180) dh -= 360;
  else if (dh < -180) dh += 360;
  const dH = 2 * Math.sqrt(c1 * c2) * Math.sin(rad(dh / 2));
  const lMean = (l1 + l2) / 2;
  const cMean = (c1 + c2) / 2;
  let hMean = h1 + h2;
  if (c1 * c2 !== 0)
    hMean =
      Math.abs(h1 - h2) <= 180
        ? (h1 + h2) / 2
        : h1 + h2 < 360
        ? (h1 + h2 + 360) / 2
        : (h1 + h2 - 360) / 2;
  const t =
    1 -
    0.17 * Math.cos(rad(hMean - 30)) +
    0.24 * Math.cos(rad(2 * hMean)) +
    0.32 * Math.cos(rad(3 * hMean + 6)) -
    0.2 * Math.cos(rad(4 * hMean - 63));
  const sl =
    1 + (0.015 * (lMean - 50) ** 2) / Math.sqrt(20 + (lMean - 50) ** 2);
  const sc = 1 + 0.045 * cMean;
  const sh = 1 + 0.015 * cMean * t;
  const rt =
    -Math.sin(rad(60 * Math.exp(-(((hMean - 275) / 25) ** 2)))) *
    2 *
    Math.sqrt(cMean ** 7 / (cMean ** 7 + 25 ** 7));
  const [dl, dc, dhs] = [(l2 - l1) / sl, (c2 - c1) / sc, dH / sh];
  return Math.sqrt(dl ** 2 + dc ** 2 + dhs ** 2 + rt * dc * dhs);
};

const palette = (theme) =>
  [1, 2, 3, 4, 5, 6].map((rank) =>
    resolve(tokens.themes[theme].color[`dataCategory${rank}`])
  );

// Seuil d'écart perçu : sous 15, deux catégories se confondent à l'œil.
const MINIMUM_DELTA_E = 15;

describe("category chart palette (#172)", () => {
  it("measures perceived differences with CIEDE2000", () => {
    expect(deltaE("#FFFFFF", "#FFFFFF")).toBe(0);
    expect(deltaE("#7C3AED", "#4338CA")).toBeLessThan(MINIMUM_DELTA_E);
  });

  for (const theme of ["light", "dark"])
    it(`keeps every ${theme} palette color distinct from the others and from the picker`, () => {
      const colors = palette(theme);
      for (const [index, color] of colors.entries()) {
        for (const other of colors.slice(index + 1))
          expect(
            deltaE(color, other),
            `${color} / ${other}`
          ).toBeGreaterThanOrEqual(MINIMUM_DELTA_E);
        for (const { value } of PICKER)
          expect(
            deltaE(color, value),
            `${color} / ${value}`
          ).toBeGreaterThanOrEqual(MINIMUM_DELTA_E);
      }
    });
});
