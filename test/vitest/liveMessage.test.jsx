import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { LiveMessage } from "../../src/js/components/LiveMessage";

afterEach(cleanup);

describe("LiveMessage", () => {
  it("keeps both live regions mounted before any message", () => {
    const { rerender } = render(<LiveMessage message="" isError={false} />);
    const status = screen.getByRole("status");
    const alert = screen.getByRole("alert");
    expect(status).toBeEmptyDOMElement();
    expect(alert).toBeEmptyDOMElement();

    rerender(<LiveMessage message="Catégorie ajoutée." isError={false} />);
    // Même élément : le lecteur d'écran observe déjà cette région.
    expect(screen.getByRole("status")).toBe(status);
    expect(status).toHaveTextContent("Catégorie ajoutée.");
    expect(alert).toBeEmptyDOMElement();

    rerender(<LiveMessage message="Enregistrement impossible." isError />);
    expect(screen.getByRole("alert")).toBe(alert);
    expect(alert).toHaveTextContent("Enregistrement impossible.");
    expect(status).toBeEmptyDOMElement();
  });

  it("shows the message once, hidden from screen readers to avoid a double reading", () => {
    const { container } = render(
      <LiveMessage
        message="Catégorie ajoutée."
        isError={false}
        className="one-off-message"
        errorClassName="one-off-message--error"
      />
    );
    const visible = container.querySelector(".one-off-message");
    expect(visible).toHaveTextContent("Catégorie ajoutée.");
    expect(visible).toHaveAttribute("aria-hidden", "true");
    expect(visible).not.toHaveClass("one-off-message--error");
  });

  it("renders no visible message when there is nothing to say", () => {
    const { container } = render(
      <LiveMessage message="" isError={false} className="one-off-message" />
    );
    expect(container.querySelector(".one-off-message")).toBeNull();
  });
});
