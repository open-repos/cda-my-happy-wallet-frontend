import React, { useEffect, useState } from "react";
import "../../css/LiveMessage.css";

/**
 * Message de page annoncé de façon fiable (#151). Une région live montée en
 * même temps que son texte n'est pas toujours lue : les deux régions (statut
 * et alerte) restent montées, visuellement masquées et hors du flux, et
 * reçoivent le texte. Le message visible, identique, est masqué aux lecteurs
 * d'écran pour éviter une double lecture. `visible={false}` annonce sans
 * copie visible, quand l'écran affiche déjà l'état autrement (#164).
 *
 * Au premier rendu, les régions sont montées vides et ne reçoivent le texte
 * qu'au tick suivant (#164) : un chargement présent dès l'arrivée sur la page
 * est ainsi annoncé lui aussi. La copie visible, elle, est immédiate.
 */
export const LiveMessage = ({
  message,
  isError,
  className,
  errorClassName,
  visible = true,
}) => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    // `setTimeout` plutôt qu'un simple effet : React peut appliquer un effet
    // de façon synchrone dans le même commit, avant l'observation du lecteur.
    const timer = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(timer);
  }, []);
  const announced = mounted ? message : "";

  return (
    <>
      <p className="live-message__region" role="status">
        {announced && !isError ? announced : ""}
      </p>
      <p className="live-message__region" role="alert">
        {announced && isError ? announced : ""}
      </p>
      {message && visible ? (
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
};
