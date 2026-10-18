import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

// jsdom ne sert pas les ressources Vite : les tracés d'icônes viennent du
// fichier versionné. Un test peut simuler un échec avec `mockRejectedValueOnce`.
vi.mock("../../src/js/components/Categories/categoryIconSource", () => ({
  fetchCategoryIcons: vi.fn(() =>
    import("../../src/assets/category-icons.json").then(
      (module) => module.default.icons
    )
  ),
}));
