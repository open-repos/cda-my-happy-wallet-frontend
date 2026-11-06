import React from "react";
import { LiveMessage } from "../LiveMessage";
import { useAnnouncesLoading } from "../../hooks/useAnnouncesLoading";

/**
 * Chargement ou erreur d'un bloc de l'accueil, avec relance. Affichage seul :
 * l'annonce passe par `SectionAnnouncement`, toujours monté (#164).
 */
export const SectionState = ({ status, loadingText, errorText, onRetry }) =>
  status === "loading" ? (
    <p className="home-budget__state" aria-hidden="true">
      {loadingText}
    </p>
  ) : (
    <div className="home-budget__state">
      <p aria-hidden="true">{errorText}</p>
      <button type="button" className="home-budget__button" onClick={onRetry}>
        Réessayer
      </button>
    </div>
  );

/**
 * Régions live du bloc, montées en permanence : le chargement puis l'échec
 * sont annoncés de façon fiable, même quand l'affichage change de forme.
 */
export const SectionAnnouncement = ({
  status,
  loadingKey,
  loadingText,
  errorText,
}) => {
  // Clé de la section fournie par useHomeBudget ; le texte distingue aussi
  // les blocs utilisés seuls, sans hook de données (tests ou autre écran).
  const announcesLoading = useAnnouncesLoading(
    status,
    loadingKey ?? loadingText
  );
  return (
    <LiveMessage
      message={
        announcesLoading ? loadingText : status === "error" ? errorText : ""
      }
      isError={status === "error"}
      visible={false}
    />
  );
};
