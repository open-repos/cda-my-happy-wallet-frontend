import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEllipsisH } from "@fortawesome/free-solid-svg-icons";
import { ActionButton } from "../Actions/ActionButton";

/**
 * Shared inline editing for CompactMoneyList rows (#358).
 *
 * In the table (≥ 64rem) an edited row keeps the read row geometry: each cell
 * holds one control and one reserved message line, labels are visually hidden
 * behind the column headers, and secondary fields stay behind « Plus
 * d’options ». Below 64rem the row is the existing stacked card.
 */
export const messageId = (id) => `${id}-message`;

/**
 * One editable cell: label, control and its reserved message line. In the
 * table an error shows `shortError`, sized for the column, while the control's
 * accessible description keeps the full message; cards show the full one.
 */
export const InlineCell = ({
  id,
  label,
  error,
  shortError,
  hint,
  className = "",
  children,
}) => {
  const message = error || hint;
  return (
    <div className={`inline-cell ${className}`.trim()}>
      <label htmlFor={id} className="inline-cell__label">
        {label}
      </label>
      {children({
        id,
        "aria-invalid": Boolean(error),
        "aria-describedby": message ? messageId(id) : undefined,
      })}
      <span
        id={messageId(id)}
        className={`inline-cell__message${
          error ? " inline-cell__message--error" : ""
        }`}
      >
        {error ? (
          <>
            <span className="inline-cell__short" aria-hidden="true">
              {shortError ?? error}
            </span>
            <span className="inline-cell__full">{error}</span>
          </>
        ) : (
          hint
        )}
      </span>
    </div>
  );
};

const submits = (target) =>
  target.matches(
    'select, input:not([type="checkbox"]):not([type="radio"]):not([type="button"])'
  );

/** Editor row: Escape cancels without a write, Enter saves from any field. */
export const InlineEditorRow = ({
  busy,
  onCancel,
  revealed = false,
  className = "",
  children,
}) => (
  <tr
    className={`compact-money-table__editor${
      revealed ? " is-revealed" : ""
    } ${className}`.trim()}
    onKeyDown={(event) => {
      if (event.key === "Escape" && !busy) {
        event.preventDefault();
        onCancel();
      } else if (
        event.key === "Enter" &&
        !event.defaultPrevented &&
        submits(event.target) &&
        event.target.form
      ) {
        event.preventDefault();
        if (!busy) event.target.form.requestSubmit();
      }
    }}
  >
    {children}
  </tr>
);

/**
 * Actions cell: owns the row form, the secondary fields and the row message.
 * With `onMoreOptions` the full form opens; otherwise the secondary fields
 * unfold in the row, which is then allowed to grow.
 */
export const InlineActions = ({
  formId,
  onSubmit,
  busy,
  saveLabel,
  saveDisabled = false,
  onCancel,
  onMoreOptions,
  revealed,
  onReveal,
  message,
  live,
  children,
}) => (
  <form id={formId} noValidate onSubmit={onSubmit} className="inline-actions">
    {children && (
      <div className="inline-actions__secondary" id={`${formId}-secondary`}>
        {children}
      </div>
    )}
    <div className="inline-actions__buttons">
      <ActionButton
        action="save"
        type="submit"
        className="one-off-button"
        disabled={busy || saveDisabled}
        busy={busy}
        aria-label={busy ? undefined : saveLabel}
      >
        {busy ? "Enregistrement…" : "Enregistrer"}
      </ActionButton>
      <ActionButton
        action="cancel"
        type="button"
        className="one-off-button one-off-button--secondary inline-icon-action"
        disabled={busy}
        onClick={onCancel}
      >
        Annuler
      </ActionButton>
      {children && (
        <button
          type="button"
          className="inline-actions__more"
          aria-label="Plus d’options"
          title="Plus d’options"
          disabled={busy}
          aria-haspopup={onMoreOptions ? "dialog" : undefined}
          aria-expanded={onMoreOptions ? undefined : revealed}
          aria-controls={onMoreOptions ? undefined : `${formId}-secondary`}
          onClick={onMoreOptions ?? onReveal}
        >
          <FontAwesomeIcon
            icon={faEllipsisH}
            focusable="false"
            aria-hidden="true"
          />
        </button>
      )}
    </div>
    {live && <span className="inline-actions__live">{live}</span>}
    <span className="inline-actions__message">{message}</span>
  </form>
);
