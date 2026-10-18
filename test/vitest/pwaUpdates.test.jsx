import React from "react";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PwaUpdates } from "../../src/js/pwa/PwaUpdates.jsx";
import { createPwaUpdates } from "../../src/js/pwa/updateClient.js";
vi.mock("../../src/js/pwa/updateClient.js", () => ({
  createPwaUpdates: vi.fn(),
}));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("PWA update notice", () => {
  it("does not start registration in the default build", () => {
    const { container } = render(<PwaUpdates />);
    expect(container).toBeEmptyDOMElement();
    expect(createPwaUpdates).not.toHaveBeenCalled();
  });
  it("keeps a stable announcement and exposes explicit actions through disposal", () => {
    const client = {
      start: vi.fn(),
      activate: vi.fn(),
      reload: vi.fn(),
      retry: vi.fn(),
      dispose: vi.fn(),
    };
    createPwaUpdates.mockReturnValue(client);
    const { unmount } = render(<PwaUpdates enabled />);
    const announcement = screen.getByRole("status");
    expect(announcement).toBeEmptyDOMElement();
    const { onState } = createPwaUpdates.mock.calls[0][0];
    act(() => onState({ phase: "waiting" }));
    expect(screen.getByRole("status")).toBe(announcement);
    expect(announcement).toHaveTextContent(
      "Une nouvelle version est disponible"
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Préparer la mise à jour" })
    );
    expect(client.activate).toHaveBeenCalledOnce();
    act(() => onState({ phase: "waiting", reason: "editing" }));
    expect(announcement).toHaveTextContent(
      "Terminez ou fermez les formulaires"
    );
    act(() => onState({ phase: "applying" }));
    expect(screen.queryByRole("button")).toBeNull();
    act(() => onState({ phase: "reload" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Recharger l’application" })
    );
    expect(client.reload).toHaveBeenCalledOnce();
    act(() => onState({ phase: "error" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Réessayer la mise à jour" })
    );
    expect(client.retry).toHaveBeenCalledOnce();
    unmount();
    expect(client.dispose).toHaveBeenCalledOnce();
  });
});
