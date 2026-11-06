import React, { useEffect, useRef, useState } from "react";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DeleteConfirmation } from "../../src/js/components/Actions/DeleteConfirmation";

afterEach(cleanup);

/** A form listening to Escape on document, like the budget forms. */
const Harness = ({ onFormEscape, onConfirm = vi.fn() }) => {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const trigger = useRef(null);
  useEffect(() => {
    const key = (event) => event.key === "Escape" && onFormEscape();
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, [onFormEscape]);
  return (
    <div id="root">
      <button ref={trigger} type="button" onClick={() => setOpen(true)}>
        Supprimer
      </button>
      <button type="button" onClick={() => setBusy((value) => !value)}>
        Basculer
      </button>
      {open && (
        <DeleteConfirmation
          title="Loyer"
          busy={busy}
          onConfirm={onConfirm}
          onCancel={() => setOpen(false)}
          returnFocusRef={trigger}
        />
      )}
    </div>
  );
};

describe("delete confirmation dialog", () => {
  it("opens a named modal alert dialog focused on the keep action", () => {
    render(<Harness onFormEscape={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Supprimer" }));
    const dialog = screen.getByRole("alertdialog", {
      name: "Supprimer « Loyer » ?",
    });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(screen.getByRole("button", { name: "Annuler" })).toHaveFocus();
  });

  it("keeps the item on Escape without closing the parent form", () => {
    const onFormEscape = vi.fn();
    const onConfirm = vi.fn();
    render(<Harness onFormEscape={onFormEscape} onConfirm={onConfirm} />);
    const trigger = screen.getByRole("button", { name: "Supprimer" });
    trigger.focus();
    fireEvent.click(trigger);
    fireEvent.keyDown(screen.getByRole("button", { name: "Annuler" }), {
      key: "Escape",
    });
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(onFormEscape).not.toHaveBeenCalled();
    expect(onConfirm).not.toHaveBeenCalled();
    expect(trigger).toHaveFocus();
  });

  it("keeps the item from the backdrop", () => {
    render(<Harness onFormEscape={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Supprimer" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Conserver et fermer", hidden: true })
    );
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("announces a failed action inside the dialog", async () => {
    vi.useFakeTimers();
    try {
      render(<Harness onFormEscape={vi.fn()} />);
      fireEvent.click(screen.getByRole("button", { name: "Supprimer" }));
      const toggle = screen.getByRole("button", {
        name: "Basculer",
        hidden: true,
      });
      fireEvent.click(toggle); // busy
      fireEvent.click(toggle); // ended without closing: failure
      await act(async () => vi.runAllTimers());
      expect(screen.getByRole("alert")).toHaveTextContent(
        "L’action n’a pas abouti."
      );
    } finally {
      vi.useRealTimers();
    }
  });
});
