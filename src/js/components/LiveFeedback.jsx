import React from "react";
import "../../css/LiveFeedback.css";

/** Keep both live regions mounted before their text changes. */
export const LiveFeedback = ({ message, isError, className }) => (
  <>
    <p
      className={`live-feedback ${className}`}
      role="status"
      aria-atomic="true"
    >
      {isError ? "" : message}
    </p>
    <p
      className={`live-feedback ${className} ${className}--error`}
      role="alert"
      aria-atomic="true"
    >
      {isError ? message : ""}
    </p>
  </>
);
