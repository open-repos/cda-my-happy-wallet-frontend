import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChevronCircleLeft,
  faEdit,
  faEuroSign,
  faChartColumn,
  faTags,
} from "@fortawesome/free-solid-svg-icons";
import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("Font Awesome compatibility with React 18", () => {
  // React warns once per component: check the first real render in this file.
  it("renders without the function-component defaultProps warning", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    render(<FontAwesomeIcon icon={faEuroSign} />);
    expect(error).not.toHaveBeenCalled();
  });

  it.each([faChevronCircleLeft, faEdit, faEuroSign, faChartColumn, faTags])(
    "preserves the SVG and decorative attributes for $iconName",
    (icon) => {
      const { container } = render(
        <FontAwesomeIcon
          icon={icon}
          className="wallet-icon"
          aria-hidden="true"
        />
      );
      const svg = container.querySelector("svg");
      expect(svg).toHaveClass("wallet-icon");
      expect(svg).toHaveAttribute("data-icon", icon.iconName);
      expect(svg).toHaveAttribute(
        "viewBox",
        `0 0 ${icon.icon[0]} ${icon.icon[1]}`
      );
      expect(svg).toHaveAttribute("aria-hidden", "true");
      expect(svg.querySelector("path")).toHaveAttribute("d", icon.icon[4]);
    }
  );

  it("preserves the accessible title", () => {
    render(<FontAwesomeIcon icon={faEdit} title="Modifier" />);
    expect(screen.getByRole("img", { name: "Modifier" })).toContainElement(
      screen.getByText("Modifier", { selector: "title" })
    );
  });

  it("preserves an explicit accessible label", () => {
    render(
      <FontAwesomeIcon
        icon={faEdit}
        aria-label="Modifier la charge"
        aria-hidden="false"
      />
    );
    expect(
      screen.getByRole("img", { name: "Modifier la charge" })
    ).toHaveAttribute("aria-label", "Modifier la charge");
  });
});
