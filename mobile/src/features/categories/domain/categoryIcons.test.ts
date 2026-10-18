import { describe, expect, it } from "vitest";

import glyphMap from "@expo/vector-icons/build/vendor/react-native-vector-icons/glyphmaps/FontAwesome6Free.json";
import meta from "@expo/vector-icons/build/vendor/react-native-vector-icons/glyphmaps/FontAwesome6Free_meta.json";
// Garde-fou sans checkout backend : même liste et mêmes suggestions que le Web.
import webIcons from "../../../../../src/assets/category-icons.json";
import { SUGGESTED_ICONS as WEB_SUGGESTIONS } from "../../../../../src/js/utils/categoryIcons.js";
import {
  ALLOWED_CATEGORY_ICONS,
  SUGGESTED_CATEGORY_ICONS,
  fontAwesomeIcon,
  iconLabel,
  searchCategoryIcons,
} from "@/src/features/categories/domain/categoryIcons";

describe("mobile category icons", () => {
  it("only allows Free solid and regular glyphs of the FontAwesome6 font", () => {
    expect(ALLOWED_CATEGORY_ICONS.length).toBeGreaterThan(1000);
    for (const icon of ALLOWED_CATEGORY_ICONS) {
      const [style, name] = icon.split(":");
      expect(name in glyphMap).toBe(true);
      expect((meta as Record<string, string[]>)[style]).toContain(name);
    }
  });

  it("stays generated from the same allowlist and suggestions as the Web", () => {
    expect(ALLOWED_CATEGORY_ICONS).toEqual(Object.keys(webIcons.icons).sort());
    expect(SUGGESTED_CATEGORY_ICONS).toEqual(WEB_SUGGESTIONS);
  });

  it("shares the Web French suggestions", () => {
    expect(SUGGESTED_CATEGORY_ICONS.length).toBeGreaterThanOrEqual(12);
    for (const { icon } of SUGGESTED_CATEGORY_ICONS) {
      expect(ALLOWED_CATEGORY_ICONS).toContain(icon);
    }
    expect(searchCategoryIcons("")).toEqual(
      SUGGESTED_CATEGORY_ICONS.map(({ icon }) => icon),
    );
  });

  it("searches by French keyword or Font Awesome name, capped", () => {
    expect(searchCategoryIcons("Courses")[0]).toBe("solid:cart-shopping");
    expect(searchCategoryIcons("santé")).toContain("solid:heart-pulse");
    expect(searchCategoryIcons("heart")).toEqual(
      expect.arrayContaining(["solid:heart", "regular:heart"]),
    );
    expect(searchCategoryIcons("zzzz-none")).toEqual([]);
    expect(searchCategoryIcons("a", 24)).toHaveLength(24);
  });

  it("labels and resolves an icon for the FontAwesome6 component", () => {
    expect(iconLabel("regular:heart")).toBe("heart (contour)");
    expect(fontAwesomeIcon("solid:utensils")).toEqual({
      name: "utensils",
      solid: true,
    });
    expect(fontAwesomeIcon("regular:heart")).toEqual({
      name: "heart",
      solid: false,
    });
    // Icône retirée de la liste ou absente : pastille de couleur.
    expect(fontAwesomeIcon("solid:zz-retired")).toBeNull();
    expect(fontAwesomeIcon(null)).toBeNull();
  });
});
