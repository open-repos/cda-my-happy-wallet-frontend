import { CalendarMode } from "../domain/budgetCalendar";

/** All modes share the available width; system font scale never grows the grid. */
export const calendarGridWidth = (
  viewportWidth: number,
  _mode: CalendarMode,
  _fontScale: number,
): number => viewportWidth;

/** Only compact cell amounts are bounded; exact amounts and spoken labels remain full size. */
export const CALENDAR_AMOUNT_TEXT_PROPS = {
  allowFontScaling: true,
  maxFontSizeMultiplier: 1.3,
  adjustsFontSizeToFit: false,
} as const;
