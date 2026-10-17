import React from "react";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useCategories } from "../../src/js/hooks/useCategories";
import { categoryService } from "../../src/js/services/categoryService";

vi.mock("../../src/js/services/categoryService", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    categoryService: {
      listAll: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
    },
  };
});

let api;
const Probe = () => {
  api = useCategories();
  return (
    <p data-testid="probe">
      {api.status}|{api.mutationStatus}|{api.categories.length}|{api.message}
    </p>
  );
};
const text = () => screen.getByTestId("probe").textContent;
const apiError = (status, code) =>
  Object.assign(new Error(code), {
    response: { status, data: { error: { details: { code } } } },
  });

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("useCategories", () => {
  it("loads categories and reloads them after a successful command", async () => {
    categoryService.listAll
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: 1, name: "Loisirs", color: null }]);
    categoryService.create.mockResolvedValue({ id: 1 });
    render(<Probe />);
    await waitFor(() => expect(text()).toBe("success|idle|0|"));

    let result;
    await act(async () => {
      result = await api.saveCategory(null, { name: "Loisirs", color: null });
    });

    expect(result).toEqual({ ok: true, code: null });
    expect(text()).toBe("success|success|1|Catégorie ajoutée.");
  });

  it("returns the conflict code so the form can point at the name", async () => {
    categoryService.listAll.mockResolvedValue([]);
    categoryService.update.mockRejectedValue(
      apiError(409, "CATEGORY_NAME_CONFLICT")
    );
    render(<Probe />);
    await waitFor(() => expect(text()).toBe("success|idle|0|"));

    let result;
    await act(async () => {
      result = await api.saveCategory(3, { name: "Loisirs", color: null });
    });

    expect(result).toEqual({ ok: false, code: "CATEGORY_NAME_CONFLICT" });
    expect(text()).toBe(
      "success|error|0|Une catégorie porte déjà ce nom. Choisissez-en un autre."
    );
  });

  it("explains why a used category cannot be deleted", async () => {
    categoryService.listAll.mockResolvedValue([
      { id: 3, name: "Loisirs", color: null },
    ]);
    categoryService.remove.mockRejectedValue(apiError(409, "CATEGORY_IN_USE"));
    render(<Probe />);
    await waitFor(() => expect(text()).toMatch(/^success\|idle\|1/));

    let result;
    await act(async () => {
      result = await api.deleteCategory(3);
    });

    expect(result.code).toBe("CATEGORY_IN_USE");
    expect(text()).toContain("Cette catégorie est utilisée par des opérations");
  });

  it("reloads the list when the category no longer exists", async () => {
    categoryService.listAll.mockResolvedValue([]);
    categoryService.remove.mockRejectedValue(apiError(404));
    render(<Probe />);
    await waitFor(() => expect(text()).toBe("success|idle|0|"));

    await act(async () => {
      await api.deleteCategory(3);
    });

    expect(categoryService.listAll).toHaveBeenCalledTimes(2);
    expect(text()).toContain("Cette catégorie n’existe plus.");
  });

  it("exposes a recoverable load error", async () => {
    categoryService.listAll
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce([]);
    render(<Probe />);
    await waitFor(() => expect(text()).toMatch(/^error\|/));

    await act(async () => {
      await api.retry();
    });
    expect(text()).toBe("success|idle|0|");
  });
});
