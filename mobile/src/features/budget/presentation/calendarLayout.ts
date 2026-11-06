import { semantic } from "@/src/design/tokens";
import { CalendarMode } from "../domain/budgetCalendar";

/** Keep seven columns, scrolling within the calendar instead of shrinking text
 * or overlapping 48 dp targets. Native fontScale also grows the text column. */
export const calendarGridWidth = (
  viewportWidth: number,
  mode: CalendarMode,
  fontScale: number,
): number =>
  Math.max(
    viewportWidth,
    7 *
      (mode === "forecast" ? 96 : semantic.size.controlMinHeight) *
      Math.max(1, fontScale),
  );
