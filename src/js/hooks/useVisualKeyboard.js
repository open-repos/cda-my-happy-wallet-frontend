import { useEffect, useState } from "react";
/** A wide phone in landscape still has a software keyboard. */
export const useVisualKeyboard = () => {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const update = () => {
      const editable = document.activeElement?.matches(
        'input:not([type="checkbox"]):not([type="radio"]):not([type="button"]),textarea,[contenteditable="true"]'
      );
      const viewport = window.visualViewport;
      setVisible(
        Boolean(
          editable && viewport && viewport.height < window.innerHeight - 80
        )
      );
    };
    const observer = new MutationObserver(update);
    observer.observe(document.body, { childList: true, subtree: true });
    document.addEventListener("focusin", update);
    document.addEventListener("focusout", update);
    window.visualViewport?.addEventListener("resize", update);
    window.addEventListener("resize", update);
    return () => {
      observer.disconnect();
      document.removeEventListener("focusin", update);
      document.removeEventListener("focusout", update);
      window.visualViewport?.removeEventListener("resize", update);
      window.removeEventListener("resize", update);
    };
  }, []);
  return visible;
};
