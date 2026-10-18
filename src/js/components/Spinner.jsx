import React from "react";
import "../../css/Spinner.css";

export default function Spinner() {
  return (
    <div
      className="spinner-container"
      role="status"
      aria-live="polite"
      aria-label="Chargement en cours"
    >
      <div className="loading-spinner" aria-hidden="true" />
    </div>
  );
}
