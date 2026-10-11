import React from "react";

/** Chargement ou erreur d'un bloc de l'accueil, avec relance. */
export const SectionState = ({ status, loadingText, errorText, onRetry }) =>
  status === "loading" ? (
    <p className="home-budget__state" role="status">
      {loadingText}
    </p>
  ) : (
    <div className="home-budget__state" role="alert">
      <p>{errorText}</p>
      <button type="button" className="home-budget__button" onClick={onRetry}>
        Réessayer
      </button>
    </div>
  );
