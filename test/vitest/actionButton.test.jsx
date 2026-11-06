import { DeleteConfirmation } from "../../src/js/components/Actions/DeleteConfirmation";
import React, { createRef, StrictMode } from "react";
import { afterEach, describe, it, expect, vi } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { Button } from "../../src/js/components/Actions/Button";
import { ActionButton } from "../../src/js/components/Actions/ActionButton";
afterEach(cleanup);
describe("shared action buttons", () => {
  it("preserves form semantics, focus ref, explicit label and decorative icon", () => {
    const submit = vi.fn(),
      clicked = vi.fn(),
      ref = createRef();
    render(
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <ActionButton
          action="delete"
          ref={ref}
          onClick={clicked}
          aria-label="Supprimer Courses"
        >
          Supprimer
        </ActionButton>
      </form>
    );
    const b = screen.getByRole("button", { name: "Supprimer Courses" });
    fireEvent.click(b);
    expect(clicked).toHaveBeenCalledTimes(1);
    expect(submit).not.toHaveBeenCalled();
    expect(ref.current).toBe(b);
    expect(b).toHaveClass("action-button--danger");
    expect(b.querySelector('[aria-hidden="true"] svg')).not.toBeNull();
  });
  it("exposes busy/disabled, blocks activation and keeps submit opt-in", () => {
    const clicked = vi.fn();
    const { rerender } = render(
      <Button busy onClick={clicked}>
        Enregistrer
      </Button>
    );
    const b = screen.getByRole("button");
    expect(b).toBeDisabled();
    expect(b).toHaveAttribute("aria-busy", "true");
    fireEvent.click(b);
    expect(clicked).not.toHaveBeenCalled();
    rerender(<Button type="submit">Enregistrer</Button>);
    expect(screen.getByRole("button")).toHaveAttribute("type", "submit");
  });

  it.each([
    "add",
    "edit",
    "delete",
    "save",
    "cancel",
    "convert",
    "simulate",
    "apply",
    "reset",
  ])("renders the %s action with a label and a decorative icon", (action) => {
    render(<ActionButton action={action} />);
    const button = screen.getByRole("button");
    expect(button).toHaveAccessibleName();
    expect(button.querySelector('[aria-hidden="true"] svg')).not.toBeNull();
    expect(button).toHaveAttribute("data-variant");
  });
});

it("keeps cancellation focused through StrictMode replay and restores the trigger on close", async () => {
  const trigger = createRef();
  const content = (open) => (
    <StrictMode>
      {!open && <button ref={trigger}>Supprimer Courses</button>}
      {open && (
        <DeleteConfirmation
          title="Courses"
          onCancel={vi.fn()}
          onConfirm={vi.fn()}
          returnFocusRef={trigger}
        />
      )}
    </StrictMode>
  );
  const { rerender } = render(content(false));
  rerender(content(true));
  await act(async () => {
    await new Promise(requestAnimationFrame);
  });
  expect(screen.getByRole("button", { name: "Annuler" })).toHaveFocus();
  rerender(content(false));
  await act(async () => {
    await new Promise(requestAnimationFrame);
  });
  expect(trigger.current).toHaveFocus();
});
