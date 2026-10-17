import { describe, expect, it } from "vitest";
import { fas } from "@fortawesome/free-solid-svg-icons";
import { far } from "@fortawesome/free-regular-svg-icons";
import generated from "../../src/assets/category-icons.json";
import {
  SUGGESTED_ICONS,
  iconDataUri,
  iconLabel,
  searchCategoryIcons,
} from "../../src/js/utils/categoryIcons";

const keys = Object.keys(generated.icons);

describe("generated category icons", () => {
  it("only holds canonical Free solid and regular icons with their path", () => {
    const installed = new Set([
      ...Object.values(fas).map(({ iconName }) => `solid:${iconName}`),
      ...Object.values(far).map(({ iconName }) => `regular:${iconName}`),
    ]);
    expect(keys.length).toBeGreaterThan(1000);
    for (const key of keys) {
      expect(key).toMatch(/^(solid|regular):[a-z0-9-]+$/);
      expect(installed.has(key)).toBe(true);
      const [width, height, path] = generated.icons[key];
      expect(width).toBeGreaterThan(0);
      expect(height).toBeGreaterThan(0);
      expect(path.length).toBeGreaterThan(10);
    }
    expect(generated.attribution).toContain("CC BY 4.0");
    expect(generated.allowlistGeneratedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("category icon search", () => {
  it("suggests budget icons that are all allowed", () => {
    expect(SUGGESTED_ICONS.length).toBeGreaterThanOrEqual(12);
    for (const { icon, keywords } of SUGGESTED_ICONS) {
      expect(keys).toContain(icon);
      expect(keywords.length).toBeGreaterThan(0);
    }
    expect(searchCategoryIcons("", keys)).toEqual(
      SUGGESTED_ICONS.map(({ icon }) => icon)
    );
  });

  it("finds icons by French keyword, ignoring case and accents", () => {
    expect(searchCategoryIcons("Courses", keys)[0]).toBe("solid:cart-shopping");
    expect(searchCategoryIcons("cafe", keys)).toContain("solid:mug-hot");
    expect(searchCategoryIcons("santé", keys)).toContain("solid:heart-pulse");
  });

  it("finds icons by their Font Awesome name in both styles", () => {
    const results = searchCategoryIcons("heart", keys);
    expect(results).toContain("solid:heart");
    expect(results).toContain("regular:heart");
    expect(searchCategoryIcons("piggy bank", keys)).toContain(
      "solid:piggy-bank"
    );
    expect(searchCategoryIcons("zzzz-none", keys)).toEqual([]);
  });

  it("caps the number of results", () => {
    expect(searchCategoryIcons("a", keys, 24)).toHaveLength(24);
  });

  it("labels an icon by name and style", () => {
    expect(iconLabel("regular:heart")).toBe("heart (contour)");
    expect(iconLabel("solid:cart-shopping")).toBe("cart shopping (plein)");
  });

  it("draws an icon as a colored SVG data URI for the charts", () => {
    const uri = iconDataUri([512, 448, "M0 0h10"], "#123456");
    expect(uri.startsWith("data:image/svg+xml;charset=utf-8,")).toBe(true);
    const svg = decodeURIComponent(uri.split(",")[1]);
    expect(svg).toContain('viewBox="0 0 512 448"');
    expect(svg).toContain('fill="#123456"');
    expect(svg).toContain('d="M0 0h10"');
  });
});
