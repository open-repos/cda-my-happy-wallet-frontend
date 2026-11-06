import { useCallback, useContext, useEffect, useRef } from "react";
import { MutationFeedbackContext } from "../components/Notifications/MutationFeedbackContext";
import { isAcknowledgedWrite } from "../utils/acknowledgedWrite";

/** HTTP acknowledged with an unreadable body is still a committed write. */
export const acknowledgeMutation = async (write) => {
  try {
    await write();
    return { unreadable: false };
  } catch (error) {
    if (!isAcknowledgedWrite(error)) throw error;
    return { unreadable: true };
  }
};

/** One owner per command, with a read-only recovery callback using the latest view. */
export const useMutationFeedback = (reload) => {
  const context = useContext(MutationFeedbackContext);
  const read = useRef(reload);
  read.current = reload;
  const alive = useRef(true);
  const owner = useRef(Symbol("mutation-owner"));
  const { complete, clear } = context;
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      clear(owner.current);
    };
  }, [clear]);
  const confirm = useCallback(
    (text, { refreshed = true, unreadable = false } = {}) => {
      complete({
        owner: owner.current,
        text,
        refreshed: !alive.current || refreshed,
        unreadable,
        canReload: () => alive.current && Boolean(read.current),
        reload: async () =>
          alive.current && read.current ? read.current() : null,
      });
    },
    [complete]
  );
  return { ...context, confirm };
};

export const mutationErrorMessage = (error, fallback) =>
  error?.request && !error.response
    ? "Le résultat de l’enregistrement est incertain. Actualisez les données pour le vérifier avant de réessayer."
    : fallback;
