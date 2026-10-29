import React from "react";

export const FormHeader = ({
  id,
  children,
  busy,
  onClose,
  className = "one-off-form-panel__header",
  closeClassName = "one-off-icon-button",
}) => (
  <div className={className}>
    <h2 id={id}>{children}</h2>
    <button
      type="button"
      className={closeClassName}
      onClick={onClose}
      disabled={busy}
      aria-label="Fermer le formulaire"
    >
      ×
    </button>
  </div>
);
