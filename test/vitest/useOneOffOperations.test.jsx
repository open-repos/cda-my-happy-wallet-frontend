import React from "react";
import { act, cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useOneOffOperations } from "../../src/js/hooks/useOneOffOperations";
import { EMPTY_OPERATION_FILTERS } from "../../src/js/utils/tableQuery";
import { oneOffOperationsService as service } from "../../src/js/services/oneOffOperationsService";

vi.mock("../../src/js/services/oneOffOperationsService", () => ({
  oneOffOperationsService: {
    listOperations: vi.fn(),
    listAllCategories: vi.fn(),
    createOperation: vi.fn(),
    updateOperation: vi.fn(),
    deleteOperation: vi.fn(),
  },
}));

const operation = { id: 7, title: "Courses", amount: "42.50" };
const category = { id: 2, name: "Alimentation" };
const lastPage = (data = []) => ({
  data,
  meta: { hasNext: false, nextCursor: null },
});
const firstPage = {
  data: [operation],
  meta: { hasNext: true, nextCursor: "v1.next" },
};

const mount = () => {
  let current;
  const Probe = () => {
    current = useOneOffOperations();
    return null;
  };
  render(<Probe />);
  return {
    get current() {
      return current;
    },
  };
};

beforeEach(() => {
  vi.resetAllMocks();
  service.listOperations.mockResolvedValue(firstPage);
  service.listAllCategories.mockResolvedValue([category]);
});
afterEach(cleanup);

describe("useOneOffOperations", () => {
  it("loads operations, categories and cursor metadata", async () => {
    const result = mount();
    expect(result.current.status).toBe("loading");
    expect(result.current.operations).toEqual([]);
    await waitFor(() => expect(result.current.status).toBe("success"));
    expect(result.current.operations).toEqual([operation]);
    expect(result.current.categories).toEqual([category]);
    expect(result.current.meta).toEqual(firstPage.meta);
    expect(service.listOperations).toHaveBeenCalledExactlyOnceWith(null, {});
    expect(service.listAllCategories).toHaveBeenCalledTimes(1);
  });

  it.each(["listOperations", "listAllCategories"])(
    "recovers from a failed %s load without exposing the server error",
    async (method) => {
      service[method].mockRejectedValueOnce(new Error("private server detail"));
      const result = mount();
      await waitFor(() => expect(result.current.status).toBe("error"));
      expect(result.current.message).toBe(
        "Impossible de charger vos opérations. Vérifiez votre connexion puis réessayez."
      );
      expect(result.current.operations).toEqual([]);
      await act(async () => expect(await result.current.retry()).toBe(true));
      expect(result.current.status).toBe("success");
      expect(result.current.message).toBe("");
      expect(result.current.operations).toEqual([operation]);
    }
  );

  it("appends the next page without duplicating existing operations", async () => {
    const next = { ...operation, id: 8, title: "Prime" };
    service.listOperations
      .mockResolvedValueOnce(firstPage)
      .mockResolvedValueOnce(lastPage([operation, next]));
    const result = mount();
    await waitFor(() => expect(result.current.status).toBe("success"));
    await act(async () => result.current.loadMore());
    expect(service.listOperations).toHaveBeenLastCalledWith("v1.next", {});
    expect(result.current.operations).toEqual([operation, next]);
    expect(result.current.meta).toEqual(lastPage().meta);
    expect(result.current.pageStatus).toBe("idle");
    await act(async () => result.current.loadMore());
    expect(service.listOperations).toHaveBeenCalledTimes(2);
  });

  it.each([
    [false, "v1.next"],
    [true, null],
  ])(
    "does not paginate with hasNext=%s and cursor=%s",
    async (hasNext, nextCursor) => {
      service.listOperations.mockResolvedValue({
        data: [],
        meta: { hasNext, nextCursor },
      });
      const result = mount();
      await waitFor(() => expect(result.current.status).toBe("success"));
      await act(async () => result.current.loadMore());
      expect(service.listOperations).toHaveBeenCalledTimes(1);
    }
  );

  it("prevents another page request while a page is pending", async () => {
    let finish;
    service.listOperations
      .mockResolvedValueOnce(firstPage)
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            finish = resolve;
          })
      );
    const result = mount();
    await waitFor(() => expect(result.current.status).toBe("success"));
    let loading;
    act(() => {
      loading = result.current.loadMore();
    });
    expect(result.current.pageStatus).toBe("loading");
    await act(async () => result.current.loadMore());
    expect(service.listOperations).toHaveBeenCalledTimes(2);
    await act(async () => {
      finish(lastPage());
      await loading;
    });
    expect(result.current.pageStatus).toBe("idle");
  });

  it("keeps existing rows and retries the same cursor after a page failure", async () => {
    service.listOperations
      .mockResolvedValueOnce(firstPage)
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce(lastPage());
    const result = mount();
    await waitFor(() => expect(result.current.status).toBe("success"));
    await act(async () => result.current.loadMore());
    expect(result.current.status).toBe("success");
    expect(result.current.pageStatus).toBe("error");
    expect(result.current.operations).toEqual([operation]);
    expect(result.current.meta).toEqual(firstPage.meta);
    expect(result.current.message).toBe(
      "La page suivante n’a pas pu être chargée."
    );
    await act(async () => result.current.loadMore());
    expect(service.listOperations.mock.calls.slice(1)).toEqual([
      ["v1.next", {}],
      ["v1.next", {}],
    ]);
    expect(result.current.pageStatus).toBe("idle");
    expect(result.current.message).toBe("");
  });

  it.each([
    ["createOperation", [operation], "Opération ajoutée."],
    ["updateOperation", [7, operation], "Opération modifiée."],
    ["deleteOperation", [7], "Opération supprimée."],
  ])(
    "%s reloads the list after a successful write",
    async (method, args, message) => {
      const result = mount();
      await waitFor(() => expect(result.current.status).toBe("success"));
      service.listOperations.mockResolvedValueOnce(lastPage());
      await act(async () =>
        expect(await result.current[method](...args)).toBe(true)
      );
      expect(service[method]).toHaveBeenCalledExactlyOnceWith(...args);
      expect(service.listOperations).toHaveBeenCalledTimes(2);
      expect(service.listAllCategories).toHaveBeenCalledTimes(2);
      expect(result.current.operations).toEqual([]);
      expect(result.current.meta).toEqual(lastPage().meta);
      expect(result.current.mutationStatus).toBe("success");
      expect(result.current.message).toBe(message);
    }
  );

  it.each(["createOperation", "updateOperation", "deleteOperation"])(
    "%s reports a failed write without reloading or discarding rows",
    async (method) => {
      service[method].mockRejectedValueOnce(new Error("private server detail"));
      const result = mount();
      await waitFor(() => expect(result.current.status).toBe("success"));
      await act(async () =>
        expect(await result.current[method](7, operation)).toBe(false)
      );
      expect(result.current.mutationStatus).toBe("error");
      expect(result.current.message).toBe(
        "L’opération n’a pas pu être enregistrée. Réessayez."
      );
      expect(result.current.operations).toEqual([operation]);
      expect(service.listOperations).toHaveBeenCalledTimes(1);
    }
  );

  it("distinguishes a saved write from a failed display refresh", async () => {
    const result = mount();
    await waitFor(() => expect(result.current.status).toBe("success"));
    service.listOperations.mockRejectedValueOnce(new Error("offline"));
    await act(async () =>
      expect(await result.current.createOperation(operation)).toBe(true)
    );
    expect(result.current.status).toBe("success");
    expect(result.current.refreshError).toBe(true);
    expect(result.current.mutationStatus).toBe("success");
    expect(result.current.message).toBe(
      "La modification est enregistrée, mais la liste n’a pas pu être actualisée."
    );
    expect(service.createOperation).toHaveBeenCalledTimes(1);
    await act(async () => result.current.retry());
    expect(result.current.status).toBe("success");
    expect(service.createOperation).toHaveBeenCalledTimes(1);
  });

  it("restarts from the first page with the API sort and filters when the query changes (#361)", async () => {
    let current;
    const Probe = ({ query }) => {
      current = useOneOffOperations(query);
      return null;
    };
    const initial = { sort: null, filters: EMPTY_OPERATION_FILTERS };
    const { rerender } = render(<Probe query={initial} />);
    await waitFor(() => expect(current.status).toBe("success"));
    service.listOperations.mockResolvedValueOnce(
      lastPage([{ ...operation, id: 8 }])
    );
    await act(async () => current.loadMore());
    expect(current.operations.map((row) => row.id)).toEqual([7, 8]);
    service.listOperations.mockClear();
    const sorted = {
      sort: { field: "amount", order: "desc" },
      filters: {
        ...EMPTY_OPERATION_FILTERS,
        categoryIds: [3, 7],
        type: "ENTREE",
      },
    };
    service.listOperations.mockResolvedValueOnce(
      lastPage([{ ...operation, id: 9 }])
    );
    rerender(<Probe query={sorted} />);
    await waitFor(() => expect(current.queryStatus).toBe("idle"));
    // Une seule page, sans le curseur de l'ancienne requête.
    expect(service.listOperations).toHaveBeenCalledExactlyOnceWith(null, {
      sort: "amount",
      order: "desc",
      type: "ENTREE",
      categoryId: ["3", "7"],
    });
    expect(current.operations.map((row) => row.id)).toEqual([9]);
    expect(current.status).toBe("success");

    // Un échec garde l'écran monté et le signale sans exposer l'erreur.
    service.listOperations.mockRejectedValueOnce(new Error("private detail"));
    rerender(
      <Probe
        query={{
          sort: null,
          filters: { ...EMPTY_OPERATION_FILTERS, title: "x" },
        }}
      />
    );
    await waitFor(() => expect(current.queryStatus).toBe("error"));
    expect(current.status).toBe("success");
    expect(current.message).toBe(
      "Le tri ou les filtres n’ont pas pu être appliqués. Réessayez l’actualisation."
    );
    // Après l'échec, l'ancien curseur ne part pas avec le nouveau filtre.
    service.listOperations.mockClear();
    await act(async () => current.loadMore());
    expect(service.listOperations).not.toHaveBeenCalled();
    service.listOperations.mockResolvedValueOnce(lastPage([operation]));
    await act(async () => current.retry());
    expect(current.queryStatus).toBe("idle");
    expect(service.listOperations).toHaveBeenLastCalledWith(null, {
      title: "x",
    });
  });

  it("ignores a stale query response and blocks the old cursor while a query loads (#361)", async () => {
    let current;
    const Probe = ({ query }) => {
      current = useOneOffOperations(query);
      return null;
    };
    const query = (title) => ({
      sort: null,
      filters: { ...EMPTY_OPERATION_FILTERS, title },
    });
    const { rerender } = render(<Probe query={query("")} />);
    await waitFor(() => expect(current.status).toBe("success"));
    let resolveSlow;
    service.listOperations
      .mockImplementationOnce(
        () => new Promise((resolve) => (resolveSlow = resolve))
      )
      .mockResolvedValueOnce(
        lastPage([{ ...operation, id: 12, title: "Loyer" }])
      );
    rerender(<Probe query={query("a")} />);
    await waitFor(() => expect(current.queryStatus).toBe("loading"));
    // L'ancien curseur ne part pas avec les nouveaux filtres.
    await act(async () => current.loadMore());
    expect(service.listOperations).toHaveBeenCalledTimes(2);
    rerender(<Probe query={query("loyer")} />);
    await waitFor(() => expect(current.queryStatus).toBe("idle"));
    expect(current.operations.map((row) => row.id)).toEqual([12]);
    await act(async () => resolveSlow(lastPage([{ ...operation, id: 11 }])));
    expect(current.operations.map((row) => row.id)).toEqual([12]);
    expect(current.queryStatus).toBe("idle");
  });
});
