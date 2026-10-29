import React, { useEffect, useLayoutEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useViewportBounds } from "../../hooks/useViewportBounds";
import "../../../css/FormDialog.css";

/** Shared popup for budget forms; callers restore focus to their own trigger. */
export const FormDialog = ({
  children,
  label,
  labelledBy,
  busy = false,
  onClose,
  className = "",
  surfaceClassName = "",
  inertBackground = true,
}) => {
  const dialog = useRef(null);
  const surface = useRef(null);
  const frame = useRef(null);
  const viewportStyle = useViewportBounds();
  const revealField = () => {
    const field = document.activeElement;
    if (!surface.current?.contains(field)) return;
    // Native focus already reveals action buttons. Moving them after pointerdown
    // can cancel their click when the software keyboard reduces the viewport.
    if (
      !field.matches(
        'input,select,textarea,[role="combobox"],[contenteditable="true"]'
      )
    )
      return;
    const box = field.getBoundingClientRect();
    const bounds = surface.current.getBoundingClientRect();
    const top = bounds.top + 16;
    const bottom = bounds.bottom - 16;
    // Scroll only the popup, never the document behind the keyboard.
    if (box.top < top) surface.current.scrollTop += box.top - top;
    else if (box.bottom > bottom)
      surface.current.scrollTop += Math.min(box.bottom - bottom, box.top - top);
  };
  // WebKit can report identical bounds again after the focused field has
  // changed size. Recheck after every dialog render, including those events.
  useLayoutEffect(revealField);
  useEffect(() => {
    const root = document.getElementById("root");
    const wasInert = root?.hasAttribute("inert");
    const bodyOverflow = document.body.style.overflow;
    const htmlOverflow = document.documentElement.style.overflow;
    if (inertBackground) root?.setAttribute("inert", "");
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => {
      if (inertBackground && !wasInert) root?.removeAttribute("inert");
      document.body.style.overflow = bodyOverflow;
      document.documentElement.style.overflow = htmlOverflow;
      cancelAnimationFrame(frame.current);
    };
  }, [inertBackground]);
  const focusables = () =>
    [
      ...surface.current.querySelectorAll(
        "button, input, select, textarea, a[href], [tabindex]"
      ),
    ].filter(
      (element) =>
        element.tabIndex >= 0 &&
        !element.matches(":disabled, [type=hidden]") &&
        !element.closest("[hidden]")
    );
  useEffect(() => {
    if (!dialog.current.contains(document.activeElement))
      (focusables()[0] ?? surface.current).focus({ preventScroll: true });
  });
  return createPortal(
    <div
      ref={dialog}
      role="dialog"
      aria-modal="true"
      aria-label={label}
      aria-labelledby={labelledBy}
      className={`form-dialog ${className}`.trim()}
      style={viewportStyle}
      onFocusCapture={() => {
        cancelAnimationFrame(frame.current);
        frame.current = requestAnimationFrame(revealField);
      }}
      onKeyDown={(event) => {
        if (event.defaultPrevented) return;
        if (event.key === "Escape") {
          event.preventDefault();
          event.stopPropagation();
          if (!busy) onClose();
        }
        if (event.key === "Tab") {
          const elements = focusables();
          const first = elements[0];
          const last = elements[elements.length - 1];
          if (!first) {
            event.preventDefault();
            surface.current.focus({ preventScroll: true });
          } else if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
          }
        }
      }}
    >
      <button
        type="button"
        tabIndex={-1}
        className="form-dialog__backdrop"
        aria-label="Fermer l’ajout"
        disabled={busy}
        onClick={() => !busy && onClose()}
      />
      <div
        ref={surface}
        tabIndex={-1}
        className={`form-dialog__surface ${surfaceClassName}`.trim()}
      >
        {children}
      </div>
    </div>,
    document.body
  );
};
