import { describe, expect, it } from "vitest";

import {
  addCalendarMonths,
  formatCalendarDate,
  formatCalendarMonth,
  formatLongCalendarDate,
  getCalendarMonthDays,
  parseCalendarDate,
} from "./calendarDate";

describe("calendar dates", () => {
  it("formats and parses a local calendar date without a timezone conversion", () => {
    const date = new Date(2026, 7, 22);

    expect(formatCalendarDate(date)).toBe("2026-08-22");
    expect(parseCalendarDate("2026-08-22")).toEqual(date);
    expect(formatLongCalendarDate("2026-08-22")).toBe("22 août 2026");
  });

  it("rejects invalid calendar dates", () => {
    expect(parseCalendarDate("2026-02-29")).toBeNull();
    expect(parseCalendarDate("22/08/2026")).toBeNull();
    expect(formatLongCalendarDate("")).toBeNull();
  });

  it("builds a Monday-first leap month", () => {
    const days = getCalendarMonthDays(new Date(2024, 1, 15));

    expect(days.slice(0, 3)).toEqual([null, null, null]);
    expect(days.filter((day) => day != null)).toHaveLength(29);
    expect(days.at(-1)).toBe(29);
  });

  it("navigates across year boundaries", () => {
    const january = addCalendarMonths(new Date(2026, 11, 15), 1);

    expect(formatCalendarMonth(january)).toBe("janvier 2027");
  });
});
