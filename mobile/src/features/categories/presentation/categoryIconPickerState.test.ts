import { describe, expect, it } from "vitest";

import { getCategoryIconPickerState } from "./categoryIconPickerState";

describe("mobile icon picker feedback", () => {
  it("describes the fallback dot for a retired icon in preview and option", () => {
    const state = getCategoryIconPickerState("", "solid:zz-retired");
    expect(state.previewLabel).toBe("icône indisponible, pastille de couleur");
    expect(state.options[0]).toEqual({
      icon: "solid:zz-retired",
      label: "icône indisponible, pastille de couleur",
    });
  });

  it("keeps the selected icon without counting it as a search match", () => {
    const state = getCategoryIconPickerState("courses", "solid:heart-pulse");
    expect(state.status).toBe("1 icône proposée.");
    expect(state.options.map(({ icon }) => icon)).toEqual([
      "solid:heart-pulse",
      "solid:cart-shopping",
    ]);
    expect(state.previewLabel).toBe("icône heart pulse (plein)");
  });

  it("announces no matches even with a selected icon", () => {
    const state = getCategoryIconPickerState(
      "  zzzz-none  ",
      "solid:zz-retired",
    );
    expect(state.status).toBe("Aucune icône ne correspond à « zzzz-none ».");
    expect(state.options).toHaveLength(1);
  });

  it("does not duplicate a matching selected icon and describes no icon", () => {
    const state = getCategoryIconPickerState("courses", "solid:cart-shopping");
    expect(state.options).toEqual([
      { icon: "solid:cart-shopping", label: "cart shopping (plein)" },
    ]);
    expect(state.status).toBe("1 icône proposée.");
    expect(getCategoryIconPickerState("", null).previewLabel).toBe(
      "pastille de couleur",
    );
  });
});
