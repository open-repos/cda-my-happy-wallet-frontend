import { useEffect } from "react";

/** Focus a newly opened form, then restore its trigger or the page content. */
export const useFormFocus = (fieldRef) => {
  useEffect(() => {
    const trigger = document.activeElement;
    fieldRef.current?.focus();
    return () => {
      const target =
        trigger !== document.body && trigger?.isConnected && !trigger.disabled
          ? trigger
          : document.getElementById("main-content");
      target?.focus();
    };
  }, [fieldRef]);
};
