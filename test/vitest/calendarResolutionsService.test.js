import { beforeEach, describe, it, expect, vi } from "vitest";
import { apiPrivate } from "../../src/utils/axiosHelper";
import { listCalendarResolutions } from "../../src/js/services/calendarResolutionsService";
vi.mock("../../src/utils/axiosHelper", () => ({
  apiPrivate: { get: vi.fn() },
}));
const item = {
  eventId: 4,
  occurrenceDate: "2026-10-25",
  title: "Loyer",
  amount: "20.00",
  currency: "EUR",
  kind: "DEPENSE",
  status: "REALIZED",
  resolvedAt: "2026-10-25T10:00:00Z",
  operation: null,
};
const page = (data, next = null) => ({
  data: { data, meta: { limit: 100, hasNext: !!next, nextCursor: next } },
});
beforeEach(() => vi.resetAllMocks());
describe("calendar decisions read contract", () => {
  it("loads every page with the same civil window", async () => {
    apiPrivate.get
      .mockResolvedValueOnce(
        page(
          Array.from({ length: 100 }, (_, i) => ({ ...item, eventId: i + 1 })),
          "next"
        )
      )
      .mockResolvedValueOnce(page([{ ...item, eventId: 101 }]));
    expect(
      await listCalendarResolutions("2026-10-01", "2026-10-31")
    ).toHaveLength(101);
    expect(apiPrivate.get).toHaveBeenLastCalledWith(
      "/event-occurrence-resolutions",
      {
        params: {
          from: "2026-10-01",
          to: "2026-10-31",
          limit: 100,
          cursor: "next",
        },
        withCredentials: true,
      }
    );
  });
  it("rejects a failing last page instead of returning a partial or empty day", async () => {
    apiPrivate.get
      .mockResolvedValueOnce(page([item], "next"))
      .mockRejectedValueOnce(new Error("offline"));
    await expect(
      listCalendarResolutions("2026-10-01", "2026-10-31")
    ).rejects.toThrow("offline");
  });
  it("rejects repeated and missing cursors", async () => {
    apiPrivate.get.mockResolvedValue(page([item], "repeat"));
    await expect(
      listCalendarResolutions("2026-10-01", "2026-10-31")
    ).rejects.toThrow("Repeated");
    apiPrivate.get.mockResolvedValue({
      data: { data: [], meta: { limit: 100, hasNext: true, nextCursor: null } },
    });
    await expect(
      listCalendarResolutions("2026-10-01", "2026-10-31")
    ).rejects.toThrow();
  });
});
