import React, { useState } from "react";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { toast } from "react-toastify";
import {
  MutationFeedbackProvider,
  MutationRecovery,
} from "../../src/js/components/Notifications/MutationFeedbackProvider";
import { MutationMessage } from "../../src/js/components/Notifications/MutationMessage";
import {
  acknowledgeMutation,
  useMutationFeedback,
} from "../../src/js/hooks/useMutationFeedback";
import { AcknowledgedWriteError } from "../../src/js/utils/acknowledgedWrite";

const Harness = ({ write, reload }) => {
  const feedback = useMutationFeedback(reload);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const [form, setForm] = useState(false);
  const save = async () => {
    try {
      const result = await acknowledgeMutation(write);
      const refreshed = await reload();
      feedback.confirm("Opération ajoutée.", { refreshed, ...result });
      setSuccess(true);
      setMessage("Opération ajoutée.");
    } catch {
      setMessage("Montant refusé.");
    }
  };
  return (
    <>
      <button onClick={save}>Ajouter</button>
      <button onClick={() => setForm(!form)}>Formulaire</button>
      {form && (
        <div role="dialog" aria-modal="true">
          <input aria-label="Titre" />
        </div>
      )}
      <MutationMessage success={success} message={message} isError={!success} />
      <MutationRecovery />
    </>
  );
};
const mount = (props) =>
  render(
    <MutationFeedbackProvider>
      <Harness {...props} />
    </MutationFeedbackProvider>
  );
afterEach(() => {
  cleanup();
  toast.dismiss();
  toast.clearWaitingQueue();
  vi.restoreAllMocks();
});

describe("common mutation confirmations", () => {
  it("never emits a success on render or on a read alone", async () => {
    const spy = vi.spyOn(toast, "success");
    mount({ write: vi.fn(), reload: vi.fn().mockResolvedValue(true) });
    await act(async () => {});
    expect(spy).not.toHaveBeenCalled();
  });
  it("announces one success and suppresses the local LiveMessage copy", async () => {
    const write = vi.fn().mockResolvedValue({});
    const spy = vi.spyOn(toast, "success");
    mount({ write, reload: vi.fn().mockResolvedValue(true) });
    fireEvent.click(screen.getByRole("button", { name: "Ajouter" }));
    await waitFor(() => expect(spy).toHaveBeenCalledTimes(1));
    expect(write).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0][1]).toMatchObject({ role: "status" });
    expect(screen.queryAllByText("Opération ajoutée.")).toHaveLength(1);
    expect(
      document.querySelectorAll(".live-message__region")[0]
    ).toBeEmptyDOMElement();
  });
  it("keeps a refusal local without a success or refresh", async () => {
    const spy = vi.spyOn(toast, "success");
    const reload = vi.fn();
    mount({ write: vi.fn().mockRejectedValue(new Error("refused")), reload });
    fireEvent.click(screen.getByRole("button", { name: "Ajouter" }));
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent("Montant refusé.")
    );
    expect(spy).not.toHaveBeenCalled();
    expect(reload).not.toHaveBeenCalled();
  });
  it("retains acknowledged writes after parsing/read failures and only replays reads", async () => {
    const write = vi.fn().mockRejectedValue(new AcknowledgedWriteError());
    const reload = vi
      .fn()
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);
    const spy = vi.spyOn(toast, "info");
    mount({ write, reload });
    fireEvent.click(screen.getByRole("button", { name: "Ajouter" }));
    await waitFor(() => expect(spy).toHaveBeenCalledTimes(1));
    expect(spy.mock.calls[0][0]).toMatch(
      /Opération ajoutée.*n’ont pas pu être actualisées/
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Recharger les données" })
    );
    await waitFor(() =>
      expect(
        screen.queryByRole("button", { name: "Recharger les données" })
      ).not.toBeInTheDocument()
    );
    expect(write).toHaveBeenCalledTimes(1);
    expect(reload).toHaveBeenCalledTimes(2);
  });
  it("defers the toast until a form closes", async () => {
    const spy = vi.spyOn(toast, "success");
    // jsdom has no layout; simulate the visible dialog only for the obstruction check.
    const rects = HTMLElement.prototype.getClientRects;
    vi.spyOn(HTMLElement.prototype, "getClientRects").mockImplementation(
      function () {
        return this.getAttribute("role") === "dialog"
          ? [{ width: 100, height: 100 }]
          : rects.call(this);
      }
    );
    mount({
      write: vi.fn().mockResolvedValue({}),
      reload: vi.fn().mockResolvedValue(true),
    });
    fireEvent.click(screen.getByRole("button", { name: "Formulaire" }));
    fireEvent.click(screen.getByRole("button", { name: "Ajouter" }));
    await act(async () => {});
    expect(spy).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Formulaire" }));
    await waitFor(() => expect(spy).toHaveBeenCalledTimes(1));
  });
});
