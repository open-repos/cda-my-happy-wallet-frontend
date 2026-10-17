import React from "react";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { CategoryIconPicker } from "../../src/js/components/Categories/CategoryIconPicker";
import { CategoryLabel } from "../../src/js/components/Categories/CategoryLabel";
import { fetchCategoryIcons } from "../../src/js/components/Categories/categoryIconSource";

afterEach(cleanup);

// Fichier dédié : le pack est mis en cache au niveau du module, ce test doit
// être le premier chargement de son environnement.
describe("category icon pack loading", () => {
  it("shows a recoverable error when the icons cannot be downloaded", async () => {
    fetchCategoryIcons.mockRejectedValueOnce(new Error("offline"));
    const { container } = render(
      <>
        <CategoryLabel
          category={{
            id: 1,
            name: "Restaurants",
            color: null,
            icon: "solid:utensils",
          }}
        />
        <CategoryIconPicker
          value={null}
          onChange={() => {}}
          name=""
          color={null}
        />
      </>
    );
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Les icônes n’ont pas pu être chargées.");

    fireEvent.click(within(alert).getByRole("button", { name: "Réessayer" }));
    expect(
      await screen.findByRole("radio", { name: "cart shopping (plein)" })
    ).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    // Une seule requête échouée, partagée par l'étiquette et le sélecteur.
    expect(fetchCategoryIcons).toHaveBeenCalledTimes(2);
    // L'étiquette déjà affichée reçoit aussi le pack chargé par le sélecteur.
    expect(container.querySelector(".category-label svg")).not.toBeNull();
  });
});
