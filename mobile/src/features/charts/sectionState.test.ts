import { describe, expect, it } from "vitest";
import { sectionLoading, sectionView } from "./sectionState";

const isEmpty = (rows: number[]) => rows.length === 0;

describe("dashboard chart sections (#154)", () => {
  it("waits for a first answer before drawing anything", () => {
    expect(sectionView({ status: "loading" }, isEmpty)).toBe("loading");
  });
  it("keeps the chart displayed while it reloads", () => {
    const loaded = { status: "success" as const, data: [1, 2] };
    const reloading = sectionLoading(loaded);
    expect(reloading).toEqual({ status: "loading", data: [1, 2] });
    expect(sectionView(reloading, isEmpty)).toBe("content");
  });
  it("reports errors and empty answers", () => {
    expect(sectionView({ status: "error", data: [1] }, isEmpty)).toBe("error");
    expect(sectionView({ status: "success", data: [] }, isEmpty)).toBe("empty");
  });
});
