import React, { useEffect, useRef, useState } from "react";
import { FormDialog } from "./FormDialog";

const FAILED = "L’action n’a pas abouti. Réessayez ou conservez l’élément.";

/** Modal confirmation: Escape and the backdrop keep the item, and closing
 * returns focus to the control that opened it. Callers close it on success,
 * so an action that ends while it stays open has failed: the page behind is
 * inert, hence the failure is announced here. */
export const ConfirmDialog = ({
  label,
  busy = false,
  error = "",
  onCancel,
  children,
}) => {
  const [failed, setFailed] = useState(false);
  const wasBusy = useRef(busy);
  useEffect(() => {
    if (busy) setFailed(false);
    const ended = wasBusy.current && !busy;
    wasBusy.current = busy;
    if (!ended) return undefined;
    // A success closes the dialog in the caller's continuation, before this.
    const timer = setTimeout(() => setFailed(true), 0);
    return () => clearTimeout(timer);
  }, [busy]);
  return (
    <FormDialog
      role="alertdialog"
      label={label}
      closeLabel="Conserver et fermer"
      busy={busy}
      onClose={onCancel}
      className="confirm-dialog"
      surfaceClassName="confirm-dialog__surface"
      restoreFocus
    >
      {children}
      <p className="confirm-dialog__error" role="alert">
        {failed ? error || FAILED : ""}
      </p>
    </FormDialog>
  );
};
