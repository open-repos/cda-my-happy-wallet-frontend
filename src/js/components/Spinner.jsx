import React from "react";
import { LiveMessage } from "./LiveMessage";
import "../../css/Spinner.css";

/** Indicateur de chargement, annoncé par `LiveMessage` (#164, #171). */
export default function Spinner() {
  return (
    <div className="spinner-container">
      <LiveMessage message="Chargement en cours" visible={false} />
      <div className="loading-spinner" aria-hidden="true" />
    </div>
  );
}
