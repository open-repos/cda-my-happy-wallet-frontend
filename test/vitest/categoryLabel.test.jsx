import React from "react";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { CategoryLabel } from "../../src/js/components/Categories/CategoryLabel";

afterEach(cleanup);

describe("CategoryLabel", () => {
  it("shows the name with a decorative icon in the category color", async () => {
    const { container } = render(
      <CategoryLabel
        category={{
          id: 2,
          name: "Restaurants",
          color: "#A30707",
          icon: "solid:utensils",
        }}
      />
    );
    expect(screen.getByText("Restaurants")).toBeInTheDocument();
    await waitFor(() =>
      expect(container.querySelector("svg path")).not.toBeNull()
    );
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("aria-hidden", "true");
    expect(svg).toHaveAttribute("focusable", "false");
    expect(svg).toHaveStyle({ color: "#A30707" });
    expect(container.querySelector(".category-swatch")).toBeNull();
  });

  it("keeps the color dot without icon or for an unknown icon", () => {
    const { container, rerender } = render(
      <CategoryLabel
        category={{ id: 2, name: "Divers", color: null, icon: null }}
      />
    );
    expect(container.querySelector(".category-swatch--none")).not.toBeNull();
    expect(container.querySelector("svg")).toBeNull();

    rerender(<CategoryLabel category={undefined} />);
    expect(screen.getByText("Catégorie indisponible")).toBeInTheDocument();
  });
});
