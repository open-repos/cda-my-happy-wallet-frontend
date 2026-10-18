import React from "react";
import { LiveMessage } from "../LiveMessage";

/**
 * Chargement ou erreur d'un bloc de l'accueil, avec relance. Affichage seul :
 * l'annonce passe par `SectionAnnouncement`, toujours monté (#164).
 */
export const SectionState = ({ status, loadingText, errorText, onRetry }) =>
  status === "loading" ? (
    <p className="home-budget__state">{loadingText}</p>
  ) : (
    <div className="home-budget__state">
      <p>{errorText}</p>
      <button type="button" className="home-budget__button" onClick={onRetry}>
        Réessayer
      </button>
    </div>
  );

/**
 * Régions live du bloc, montées en permanence : le chargement puis l'échec
 * sont annoncés de façon fiable, même quand l'affichage change de forme.
 */
export const SectionAnnouncement = ({ status, loadingText, errorText }) => (
  <LiveMessage
    message={
      status === "loading" ? loadingText : status === "error" ? errorText : ""
    }
    isError={status === "error"}
    visible={false}
  />
);
