import { useEffect } from "react";

/** Focus a newly opened form, then restore its trigger or the page content. */
export const useFormFocus = (fieldRef) => {
  useEffect(() => {
    const trigger = document.activeElement;
    const inDialog = Boolean(fieldRef.current?.closest('[role="dialog"]'));
    fieldRef.current?.focus({ preventScroll: inDialog });
    return () => {
      // The popup's caller restores focus after closing. Switching form types
      // must not focus (and scroll) the underlying page during keyboard resize.
      if (inDialog) return;
      const target =
        trigger !== document.body && trigger?.isConnected && !trigger.disabled
          ? trigger
          : document.getElementById("main-content");
      target?.focus();
    };
  }, [fieldRef]);
};
