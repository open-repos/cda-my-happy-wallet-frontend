import { beforeEach, describe, expect, it, vi } from "vitest";
import service from "../../src/js/services/operationsFixesService";
import { apiPrivate } from "../../src/utils/axiosHelper";
vi.mock("../../src/utils/axiosHelper", () => ({
  apiPrivate: { get: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));
beforeEach(() => vi.clearAllMocks());
describe("contrat charges fixes", () => {
  it("charge toutes les pages sans interpréter le curseur", async () => {
    apiPrivate.get
      .mockResolvedValueOnce({
        data: {
          data: [{ idOperationFixe: 1 }],
          meta: { hasNext: true, nextCursor: "opaque==" },
        },
      })
      .mockResolvedValueOnce({
        data: {
          data: [{ idOperationFixe: 2 }],
          meta: { hasNext: false, nextCursor: null },
        },
      });
    expect((await service.getAllCharges()).data.data).toEqual([
      { idOperationFixe: 1 },
      { idOperationFixe: 2 },
    ]);
    expect(apiPrivate.get).toHaveBeenLastCalledWith(
      "/operations-fixes/charges",
      { withCredentials: true, params: { limit: 100, cursor: "opaque==" } }
    );
  });
  it("refuse un curseur répété ou une collection invalide", async () => {
    apiPrivate.get.mockResolvedValue({
      data: { data: [], meta: { hasNext: true, nextCursor: "again" } },
    });
    await expect(service.getAllCharges()).rejects.toThrow("Repeated");
    apiPrivate.get.mockResolvedValue({ data: { data: null } });
    await expect(service.getAllCharges()).rejects.toThrow("Invalid");
  });
  it("respecte les routes PUT/DELETE historiques et leurs réponses sans data", async () => {
    const body = {
      titre: "Loyer",
      montant: 1000,
      devise: "EUR",
      periodicite: "MENSUELLE",
      pourcentagePersonnel: 40,
    };
    apiPrivate.put.mockResolvedValue({
      data: { success: true, message: "ok" },
    });
    await service.putCharge(7, body);
    await service.deleteCharge(7);
    expect(apiPrivate.put).toHaveBeenCalledWith(
      "/operations-fixes/charges/7",
      body,
      { withCredentials: true }
    );
    expect(apiPrivate.delete).toHaveBeenCalledWith(
      "/operations-fixes/charges/7",
      { withCredentials: true }
    );
  });
  it("lit toutes les pages des entrées et utilise leurs routes PUT/DELETE existantes", async () => {
    apiPrivate.get
      .mockResolvedValueOnce({
        data: {
          data: [{ idOperationFixe: 1 }],
          meta: { hasNext: true, nextCursor: "incomes==" },
        },
      })
      .mockResolvedValueOnce({
        data: {
          data: [{ idOperationFixe: 2 }],
          meta: { hasNext: false, nextCursor: null },
        },
      });
    expect((await service.getAllRevenus()).data.data).toHaveLength(2);
    expect(apiPrivate.get).toHaveBeenLastCalledWith(
      "/operations-fixes/revenus",
      { withCredentials: true, params: { limit: 100, cursor: "incomes==" } }
    );
    const body = { titre: "Salaire", montant: 2000, devise: "EUR" };
    await service.putRevenu(7, body);
    await service.deleteRevenu(7);
    expect(apiPrivate.put).toHaveBeenCalledWith(
      "/operations-fixes/revenus/7",
      body,
      { withCredentials: true }
    );
    expect(apiPrivate.delete).toHaveBeenCalledWith(
      "/operations-fixes/revenus/7",
      { withCredentials: true }
    );
  });
});
