import React, { useRef, useState } from "react";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { FormDialog } from "../../src/js/components/Forms/FormDialog";
import { useFormFocus } from "../../src/js/hooks/useFormFocus";

afterEach(cleanup);

it("traps Tab at the popup boundaries and ignores dismissal while saving", () => {
  const close = vi.fn();
  const content = (busy) => (
    <FormDialog label="Création" busy={busy} onClose={close}>
      <button>Premier</button>
      <input type="hidden" />
      <button disabled>Indisponible</button>
      <button>Dernier</button>
    </FormDialog>
  );
  const { rerender } = render(content(false));
  const first = screen.getByRole("button", { name: "Premier" });
  const last = screen.getByRole("button", { name: "Dernier" });
  expect(first).toHaveFocus();
  fireEvent.keyDown(first, { key: "Tab", shiftKey: true });
  expect(last).toHaveFocus();
  fireEvent.keyDown(last, { key: "Tab" });
  expect(first).toHaveFocus();
  rerender(content(true));
  fireEvent.keyDown(first, { key: "Escape" });
  fireEvent.click(screen.getByRole("button", { name: "Fermer l’ajout" }));
  expect(close).not.toHaveBeenCalled();
  rerender(content(false));
  fireEvent.keyDown(first, { key: "Escape" });
  expect(close).toHaveBeenCalledTimes(1);
});

it("keeps focus in the popup when switching forms without scrolling its trigger", () => {
  const focus = vi.spyOn(HTMLElement.prototype, "focus");
  const Form = ({ name }) => {
    const input = useRef(null);
    useFormFocus(input);
    return <input ref={input} aria-label={name} />;
  };
  const Page = () => {
    const [kind, setKind] = useState("Charge");
    return (
      <FormDialog label="Budget" onClose={() => {}}>
        <button onClick={() => setKind("Entrée")}>Entrée</button>
        <Form key={kind} name={kind} />
      </FormDialog>
    );
  };
  render(<Page />);
  fireEvent.click(screen.getByRole("button", { name: "Entrée" }));
  expect(
    within(screen.getByRole("dialog")).getByLabelText("Entrée")
  ).toHaveFocus();
  expect(
    focus.mock.calls.every(([options]) => options?.preventScroll === true)
  ).toBe(true);
  focus.mockRestore();
});

it("portals outside the page and restores its inert/scroll state on close", () => {
  const root = document.createElement("div");
  root.id = "root";
  document.body.append(root);
  const { unmount } = render(
    <FormDialog label="Budget" onClose={() => {}}>
      <button>Fermer</button>
    </FormDialog>,
    { container: root }
  );
  expect(root).toHaveAttribute("inert");
  expect(root).not.toContainElement(screen.getByRole("dialog"));
  expect(document.body.style.overflow).toBe("hidden");
  unmount();
  expect(root).not.toHaveAttribute("inert");
  expect(document.body.style.overflow).toBe("");
  root.remove();
});
