import React, { useId, useLayoutEffect, useRef } from "react";
import { Button } from "./Button";
import { ActionButton } from "./ActionButton";
/** Inline confirmation, without a second dialog or mutation implementation. */
export const DeleteConfirmation = ({
  title,
  busy,
  onConfirm,
  onCancel,
  returnFocusRef,
  className = "",
}) => {
  const id = useId(),
    keep = useRef(null),
    restoreFrame = useRef(null);
  useLayoutEffect(() => {
    // StrictMode replays setup/cleanup: cancel a provisional restoration before
    // focusing the mounted confirmation, while retaining the real unmount path.
    cancelAnimationFrame(restoreFrame.current);
    keep.current?.focus();
    return () => {
      restoreFrame.current = requestAnimationFrame(() =>
        returnFocusRef?.current?.focus()
      );
    };
  }, [returnFocusRef]);
  return (
    <fieldset className={className} disabled={busy} aria-labelledby={id}>
      <legend id={id}>Supprimer « {title} » ?</legend>
      <Button ref={keep} onClick={onCancel} disabled={busy}>
        Annuler
      </Button>
      <ActionButton action="delete" onClick={onConfirm} disabled={busy}>
        Oui, supprimer
      </ActionButton>
    </fieldset>
  );
};
