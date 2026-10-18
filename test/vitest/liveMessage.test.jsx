import React from "react";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { LiveMessage } from "../../src/js/components/LiveMessage";

afterEach(cleanup);

describe("LiveMessage", () => {
  it("keeps both live regions mounted before any message", async () => {
    const { rerender } = render(<LiveMessage message="" isError={false} />);
    const status = screen.getByRole("status");
    const alert = screen.getByRole("alert");
    expect(status).toBeEmptyDOMElement();
    expect(alert).toBeEmptyDOMElement();

    rerender(<LiveMessage message="Catégorie ajoutée." isError={false} />);
    // Même élément : le lecteur d'écran observe déjà cette région.
    await waitFor(() => expect(status).toHaveTextContent("Catégorie ajoutée."));
    expect(screen.getByRole("status")).toBe(status);
    expect(alert).toBeEmptyDOMElement();

    rerender(<LiveMessage message="Enregistrement impossible." isError />);
    expect(screen.getByRole("alert")).toBe(alert);
    expect(alert).toHaveTextContent("Enregistrement impossible.");
    expect(status).toBeEmptyDOMElement();
  });

  it("mounts the regions empty when a message is present from the start", async () => {
    render(
      <LiveMessage message="Chargement des opérations…" visible={false} />
    );
    const status = screen.getByRole("status");
    // Premier rendu : région vide, puis texte au tick suivant (#164).
    expect(status).toBeEmptyDOMElement();
    await waitFor(() =>
      expect(status).toHaveTextContent("Chargement des opérations…")
    );
    expect(screen.getByRole("status")).toBe(status);
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
    // Copie visible immédiate, même avant l'annonce.
    const visible = container.querySelector(".one-off-message");
    expect(visible).toHaveTextContent("Catégorie ajoutée.");
    expect(visible).toHaveAttribute("aria-hidden", "true");
    expect(visible).not.toHaveClass("one-off-message--error");
  });

  it("renders no visible copy when asked or when there is nothing to say", () => {
    const { container, rerender } = render(
      <LiveMessage message="" isError={false} className="one-off-message" />
    );
    expect(container.querySelector(".one-off-message")).toBeNull();
    rerender(
      <LiveMessage
        message="Chargement…"
        visible={false}
        className="one-off-message"
      />
    );
    expect(container.querySelector(".one-off-message")).toBeNull();
    expect(container.querySelectorAll("p")).toHaveLength(2);
  });
});
