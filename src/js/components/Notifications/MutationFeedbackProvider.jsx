import { useViewportBounds } from "../../hooks/useViewportBounds";
import { useVisualKeyboard } from "../../hooks/useVisualKeyboard";
import { LiveMessage } from "../LiveMessage";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ToastContainer, toast } from "react-toastify";
import { MutationFeedbackContext } from "./MutationFeedbackContext";
import "../../../css/MutationNotifications.css";

export const FORM_ACTIVITY_SELECTOR = [
  '[role="dialog"][aria-modal="true"]',
  '[role="alertdialog"][aria-modal="true"]',
  ".monthly-event-form",
  ".one-off-form",
  ".financial-goal-form",
  ".category-form",
  ".fixed-inline",
  ".compact-inline-controls",
  ".fixed-charge-form form",
  '[aria-controls="main-navigation"][aria-expanded="true"]',
].join(",");
const isBlocked = () =>
  [...document.querySelectorAll(FORM_ACTIVITY_SELECTOR)].some(
    (element) => element.getClientRects().length && !element.closest("[hidden]")
  );

export const MutationFeedbackProvider = ({ children }) => {
  const keyboard = useVisualKeyboard();
  const viewportStyle = useViewportBounds();
  const [queue, setQueue] = useState([]);
  const [recoveries, setRecoveries] = useState([]);
  const [blocked, setBlocked] = useState(false);
  const sequence = useRef(0);
  const busy = useRef(new Set());
  const clear = useCallback((owner) => {
    setRecoveries((rows) => rows.filter((row) => row.owner !== owner));
  }, []);
  const complete = useCallback((result) => {
    const event = { ...result, id: `mutation-${++sequence.current}` };
    if (!result.refreshed) setRecoveries((rows) => [...rows, event]);
    setQueue((rows) => [...rows, event]);
  }, []);
  const retry = useCallback(async (event) => {
    if (busy.current.has(event.id) || !event.canReload()) return false;
    busy.current.add(event.id);
    try {
      const result = await event.reload();
      const ok = Array.isArray(result)
        ? result.every((value) => value !== false)
        : result !== false && result !== null;
      if (ok) {
        setRecoveries((rows) => rows.filter((row) => row.id !== event.id));
        toast.dismiss(event.id);
      }
      return ok;
    } catch {
      return false;
    } finally {
      busy.current.delete(event.id);
    }
  }, []);
  useEffect(() => {
    const update = () => setBlocked(isBlocked());
    const observer = new MutationObserver(update);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["hidden", "class", "inert", "aria-expanded"],
    });
    update();
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (blocked || keyboard || !queue.length) return undefined;
    // Let the caller close its popup/inline editor and restore focus first.
    const timer = setTimeout(() => {
      if (isBlocked()) {
        setBlocked(true);
        return;
      }
      const event = queue[0];
      const stale = !event.refreshed;
      const text = stale
        ? `${event.text} Les données n’ont pas pu être actualisées.`
        : event.text;
      toast[stale ? "info" : "success"](text, {
        toastId: event.id,
        role: "status",
        autoClose: stale ? false : 5000,
        closeOnClick: false,
      });
      setQueue((rows) => rows.filter((row) => row.id !== event.id));
    }, 0);
    return () => clearTimeout(timer);
  }, [queue, blocked, keyboard]);
  return (
    <MutationFeedbackContext.Provider
      value={{ available: true, complete, clear, recoveries, retry, blocked }}
    >
      {children}
      {createPortal(
        <div
          className="mutation-notifications"
          style={viewportStyle}
          hidden={blocked || keyboard}
        >
          <ToastContainer
            closeButton={({ closeToast }) => (
              <button
                type="button"
                className="Toastify__close-button"
                aria-label="Fermer la notification"
                onClick={closeToast}
              >
                ×
              </button>
            )}
            position="top-right"
            autoClose={5000}
            hideProgressBar
            newestOnTop={false}
            closeOnClick={false}
            rtl={false}
            pauseOnFocusLoss
            draggable={false}
            pauseOnHover
            limit={2}
          />
        </div>,
        document.body
      )}
    </MutationFeedbackContext.Provider>
  );
};

export const MutationRecovery = () => {
  const context = React.useContext(MutationFeedbackContext);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const active = context.recoveries.filter((event) => event.canReload());
  if (!active.length) return null;
  return (
    <aside className="mutation-recovery" aria-label="Actualisation des données">
      <LiveMessage
        visible={false}
        message={
          failed
            ? "L’actualisation reste indisponible. Vos modifications sont déjà enregistrées."
            : ""
        }
        isError={failed}
      />
      <p>
        {failed
          ? "L’actualisation reste indisponible. Vos modifications sont déjà enregistrées."
          : "Vos modifications sont enregistrées. Certaines données affichées peuvent être anciennes."}
      </p>
      <button
        type="button"
        className="one-off-button one-off-button--secondary"
        disabled={loading}
        onClick={async () => {
          setLoading(true);
          const results = await Promise.all(active.map(context.retry));
          setFailed(results.some((ok) => !ok));
          setLoading(false);
        }}
      >
        {loading ? "Actualisation…" : "Recharger les données"}
      </button>
    </aside>
  );
};
