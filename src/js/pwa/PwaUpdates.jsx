import React, { useEffect, useRef, useState } from "react";
import "../../css/PwaUpdates.css";
import { retirePwa } from "./retireWorker.js";
import { createPwaUpdates } from "./updateClient.js";

const messages = {
  waiting:
    "Une nouvelle version est disponible. Vous pouvez préparer sa mise à jour.",
  applying: "Préparation de la mise à jour…",
  reload:
    "La mise à jour est prête. Rechargez l’application quand vous avez terminé.",
  error:
    "La mise à jour est indisponible. Votre version actuelle reste utilisable.",
};
const reasons = {
  editing:
    "Terminez ou fermez les formulaires et boîtes de dialogue avant de continuer.",
  offline: "Reconnectez-vous à internet avant de continuer.",
};

export function PwaUpdates({
  enabled = import.meta.env.PROD && import.meta.env.VITE_PWA_ENABLED === "true",
  retire = import.meta.env.PROD && import.meta.env.VITE_PWA_RETIRE === "true",
}) {
  const client = useRef(null);
  const [state, setState] = useState({ phase: "idle", reason: null });
  const [dismissed, setDismissed] = useState(false);
  useEffect(() => {
    if (!enabled) {
      // Rollback build only: an absent flag never removes installed workers.
      if (retire) retirePwa();
      return;
    }
    let phase = "idle";
    const current = createPwaUpdates({
      enabled,
      onState: (next) => {
        if (next.phase !== phase) setDismissed(false);
        phase = next.phase;
        setState(next);
      },
    });
    const foreground = () => {
      if (document.visibilityState === "visible") setDismissed(false);
    };
    const restore = (event) => {
      foreground();
      if (event.persisted) current.retry();
    };
    document.addEventListener("visibilitychange", foreground);
    window.addEventListener("pageshow", restore);
    client.current = current;
    current.start();
    return () => {
      document.removeEventListener("visibilitychange", foreground);
      window.removeEventListener("pageshow", restore);
      client.current = null;
      current.dispose();
    };
  }, [enabled, retire]);
  if (!enabled) return null;
  const message = dismissed
    ? ""
    : reasons[state.reason] || messages[state.phase] || "";
  return (
    <>
      <p className="pwa-update__announcement" role="status" aria-atomic="true">
        {message}
      </p>
      {message && (
        <section className="pwa-update" aria-labelledby="pwa-update-title">
          <h2 id="pwa-update-title">Mise à jour de l’application</h2>
          <button
            className="pwa-update__close"
            type="button"
            aria-label="Fermer la notification de mise à jour"
            onClick={() => setDismissed(true)}
          >
            <span aria-hidden="true">×</span>
          </button>
          <p aria-hidden="true">{message}</p>
          {state.phase === "waiting" && (
            <button type="button" onClick={() => client.current?.activate()}>
              Préparer la mise à jour
            </button>
          )}
          {state.phase === "applying" && <p>Veuillez patienter.</p>}
          {state.phase === "reload" && (
            <button type="button" onClick={() => client.current?.reload()}>
              Recharger l’application
            </button>
          )}
          {state.phase === "error" && (
            <button type="button" onClick={() => client.current?.retry()}>
              Réessayer la mise à jour
            </button>
          )}
        </section>
      )}
    </>
  );
}
