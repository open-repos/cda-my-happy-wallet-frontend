import React, { forwardRef } from "react";
import "../../../css/ActionButton.css";
/** Presentation-only button; callers own commands, confirmation and invalidation. */
export const Button = forwardRef(function Button(
  {
    variant = "secondary",
    icon,
    busy = false,
    disabled = false,
    type = "button",
    children,
    className = "",
    ...props
  },
  ref
) {
  return (
    <button
      {...props}
      ref={ref}
      type={type}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      data-variant={variant}
      className={`action-button action-button--${variant} ${className}`.trim()}
    >
      {icon && (
        <span className="action-button__icon" aria-hidden="true">
          {icon}
        </span>
      )}
      <span className="action-button__label">{children}</span>
    </button>
  );
});
