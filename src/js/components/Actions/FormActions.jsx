import React from "react";

/** Validation comes first; destructive commands keep their own row and tab order. */
export const FormActions = ({ children, destructive, className = "" }) => (
  <div className={`form-actions ${className}`.trim()}>
    {children}
    <div className="form-actions__destructive">{destructive}</div>
  </div>
);
