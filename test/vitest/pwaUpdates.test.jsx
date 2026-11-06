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
import { retirePwa } from "../../src/js/pwa/retireWorker.js";
import { createPwaUpdates } from "../../src/js/pwa/updateClient.js";
vi.mock("../../src/js/pwa/updateClient.js", () => ({
  createPwaUpdates: vi.fn(),
}));
vi.mock("../../src/js/pwa/retireWorker.js", () => ({
  retirePwa: vi.fn().mockResolvedValue({ workers: 0, caches: 0 }),
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
  it("never retires an installed worker without the explicit rollback flag", () => {
    render(<PwaUpdates enabled={false} />);
    expect(retirePwa).not.toHaveBeenCalled();
  });
  it("retires the installed worker in an explicit rollback build", () => {
    const { container } = render(<PwaUpdates enabled={false} retire />);
    expect(container).toBeEmptyDOMElement();
    expect(retirePwa).toHaveBeenCalledOnce();
    expect(createPwaUpdates).not.toHaveBeenCalled();
  });
  it("keeps the worker when the build is enabled, even with the rollback flag", () => {
    createPwaUpdates.mockReturnValue({ start: vi.fn(), dispose: vi.fn() });
    render(<PwaUpdates enabled retire />);
    expect(retirePwa).not.toHaveBeenCalled();
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
    expect(
      screen.queryByRole("button", { name: "Préparer la mise à jour" })
    ).toBeNull();
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
  it.each(["waiting", "reload"])(
    "dismisses %s until the next foreground, without acting or stealing focus",
    (phase) => {
      const client = {
        start: vi.fn(),
        dispose: vi.fn(),
        retry: vi.fn(),
        activate: vi.fn(),
        reload: vi.fn(),
      };
      createPwaUpdates.mockReturnValue(client);
      const { unmount } = render(
        <>
          <button>Continuer</button>
          <PwaUpdates enabled />
        </>
      );
      const { onState } = createPwaUpdates.mock.calls[0][0];
      const continueButton = screen.getByRole("button", { name: "Continuer" });
      continueButton.focus();
      act(() => onState({ phase }));
      expect(continueButton).toHaveFocus();
      fireEvent.click(
        screen.getByRole("button", {
          name: "Fermer la notification de mise à jour",
        })
      );
      expect(screen.queryByRole("region")).toBeNull();
      expect(screen.getByRole("status")).toBeEmptyDOMElement();
      act(() => onState({ phase })); // A routine check must not undo dismissal.
      expect(screen.queryByRole("region")).toBeNull();
      Object.defineProperty(document, "visibilityState", {
        configurable: true,
        value: "hidden",
      });
      fireEvent(document, new Event("visibilitychange"));
      expect(screen.queryByRole("region")).toBeNull();
      Object.defineProperty(document, "visibilityState", {
        configurable: true,
        value: "visible",
      });
      fireEvent(document, new Event("visibilitychange"));
      expect(screen.getByRole("region")).toBeVisible();
      fireEvent.click(
        screen.getByRole("button", {
          name: "Fermer la notification de mise à jour",
        })
      );
      fireEvent(
        window,
        new PageTransitionEvent("pageshow", { persisted: true })
      );
      expect(screen.getByRole("region")).toBeVisible();
      expect(client.retry).toHaveBeenCalledOnce();
      expect(client.activate).not.toHaveBeenCalled();
      expect(client.reload).not.toHaveBeenCalled();
      act(() => onState({ phase: "idle" }));
      fireEvent(document, new Event("visibilitychange"));
      expect(screen.queryByRole("region")).toBeNull();
      unmount();
      fireEvent(
        window,
        new PageTransitionEvent("pageshow", { persisted: true })
      );
      expect(client.retry).toHaveBeenCalledOnce();
    }
  );
  it("announces readiness even when the preparation notice was dismissed", () => {
    createPwaUpdates.mockReturnValue({ start: vi.fn(), dispose: vi.fn() });
    render(<PwaUpdates enabled />);
    const { onState } = createPwaUpdates.mock.calls[0][0];
    act(() => onState({ phase: "waiting" }));
    fireEvent.click(
      screen.getByRole("button", {
        name: "Fermer la notification de mise à jour",
      })
    );
    act(() => onState({ phase: "reload" }));
    expect(
      screen.getByRole("button", { name: "Recharger l’application" })
    ).toBeVisible();
  });
});
