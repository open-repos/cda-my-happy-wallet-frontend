import React, { useRef, useState } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { useFormFocus } from "../../src/js/hooks/useFormFocus";

afterEach(cleanup);
const Form = ({ close }) => {
  const field = useRef(null);
  useFormFocus(field);
  return (
    <form>
      <label htmlFor="name">Nom</label>
      <input id="name" ref={field} />
      <button type="button" onClick={close}>
        Fermer
      </button>
    </form>
  );
};
const Page = ({ removeTrigger = false }) => {
  const [open, setOpen] = useState(false);
  return (
    <main id="main-content" tabIndex={-1}>
      {(!open || !removeTrigger) && (
        <button onClick={() => setOpen(true)}>Ajouter</button>
      )}
      {open && <Form close={() => setOpen(false)} />}
    </main>
  );
};
it.each([false, true])(
  "restores focus after closing (removed trigger: %s)",
  (removeTrigger) => {
    render(<Page removeTrigger={removeTrigger} />);
    const trigger = screen.getByRole("button", { name: "Ajouter" });
    trigger.focus();
    fireEvent.click(trigger);
    expect(screen.getByLabelText("Nom")).toHaveFocus();
    fireEvent.click(screen.getByRole("button", { name: "Fermer" }));
    expect(removeTrigger ? screen.getByRole("main") : trigger).toHaveFocus();
  }
);
