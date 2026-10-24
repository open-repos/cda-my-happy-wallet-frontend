import { describe, expect, it, vi } from "vitest";
import { writeQuickAdd } from "./QuickAddWriter";
const operation = {
  title: "Courses",
  amount: "12.50",
  kind: "ENTREE" as const,
  operationDate: "2026-10-24",
  categoryId: 4,
};
const event = {
  title: "Voyage",
  amount: "120.00",
  kind: "DEPENSE" as const,
  startDate: "2026-10-24",
  recurrence: "AUCUNE" as const,
  endDate: null,
};
describe("quick add contract", () => {
  it("creates a real income with selected date via the existing operations route", async () => {
    const request = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          data: { id: 1, ...operation, type: "ENTREE", currency: "EUR" },
        }),
        { status: 201 },
      ),
    );
    await writeQuickAdd({ request }, "income", operation);
    expect(request).toHaveBeenCalledTimes(1);
    expect(request.mock.calls[0][0]).toBe("/operations");
    expect(JSON.parse(request.mock.calls[0][1].body)).toEqual({
      ...operation,
      currency: "EUR",
    });
  });
  it.each([
    ["event", undefined],
    ["potential", "POTENTIEL"],
  ] as const)("keeps %s on the event model", async (kind, status) => {
    const request = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            id: 8,
            ...event,
            currency: "EUR",
            status: status ?? "CONFIRME",
          },
        }),
        { status: 201 },
      ),
    );
    await writeQuickAdd({ request }, kind, event);
    expect(request).toHaveBeenCalledTimes(1);
    expect(request.mock.calls[0][0]).toBe("/events");
    expect(JSON.parse(request.mock.calls[0][1].body)).toEqual({
      ...event,
      currency: "EUR",
      ...(status ? { status } : {}),
    });
  });
  it("treats an acknowledged write with an unreadable DTO as saved without replay", async () => {
    const request = vi
      .fn()
      .mockResolvedValue(new Response("not json", { status: 201 }));
    await expect(
      writeQuickAdd({ request }, "expense", operation),
    ).resolves.toBeUndefined();
    expect(request).toHaveBeenCalledTimes(1);
  });
  it("keeps a failed write as an error", async () => {
    const request = vi
      .fn()
      .mockResolvedValue(new Response("{}", { status: 422 }));
    await expect(
      writeQuickAdd({ request }, "potential", event),
    ).rejects.toThrow();
    expect(request).toHaveBeenCalledTimes(1);
  });
});
