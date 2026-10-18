import React from "react";
import "../../css/LiveMessage.css";

/**
 * Message de page annoncé de façon fiable (#151). Une région live montée en
 * même temps que son texte n'est pas toujours lue : les deux régions (statut
 * et alerte) restent montées, visuellement masquées et hors du flux, et
 * reçoivent le texte. Le message visible, identique, est masqué aux lecteurs
 * d'écran pour éviter une double lecture.
 */
export const LiveMessage = ({
  message,
  isError,
  className,
  errorClassName,
}) => (
  <>
    <p className="live-message__region" role="status">
      {message && !isError ? message : ""}
    </p>
    <p className="live-message__region" role="alert">
      {message && isError ? message : ""}
    </p>
    {message ? (
      <p
        className={
          [className, isError ? errorClassName : null]
            .filter(Boolean)
            .join(" ") || undefined
        }
        aria-hidden="true"
      >
        {message}
      </p>
    ) : null}
  </>
);
