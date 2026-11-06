import { useLayoutEffect, useRef, useState } from "react";

/** Fixed placement for a popup kept in its parent's DOM/focus scope.
 *
 * The popup follows `anchor`, stays inside the visual viewport (software
 * keyboard included), opens on the side with more room and calls `onDismiss`
 * on a pointer down outside `root`. Shared by ChoiceSelect and FilterCombobox. */
export const useAnchoredPopup = ({
  open,
  anchor,
  root,
  onDismiss,
  minWidth = 288,
  maxHeight = 320,
}) => {
  const [placement, setPlacement] = useState({});
  const dismiss = useRef(onDismiss);
  dismiss.current = onDismiss;
  useLayoutEffect(() => {
    if (!open) return undefined;
    const position = () => {
      const rect = anchor.current.getBoundingClientRect();
      const viewport = window.visualViewport;
      const top = viewport?.offsetTop || 0,
        left = viewport?.offsetLeft || 0;
      const height = viewport?.height || window.innerHeight;
      const width = viewport?.width || window.innerWidth;
      const below = top + height - rect.bottom - 8,
        above = rect.top - top - 8;
      const down = below >= above;
      const popupWidth = Math.min(Math.max(rect.width, minWidth), width - 16);
      setPlacement({
        position: "fixed",
        left: Math.max(
          left + 8,
          Math.min(rect.left, left + width - popupWidth - 8)
        ),
        width: popupWidth,
        maxHeight: Math.max(44, Math.min(maxHeight, down ? below : above)),
        ...(down
          ? { top: rect.bottom + 4 }
          : { bottom: window.innerHeight - rect.top + 4 }),
      });
    };
    position();
    const outside = (e) => {
      if (!root.current?.contains(e.target)) dismiss.current?.();
    };
    window.addEventListener("resize", position);
    window.addEventListener("scroll", position, true);
    window.visualViewport?.addEventListener("resize", position);
    window.visualViewport?.addEventListener("scroll", position);
    document.addEventListener("pointerdown", outside);
    return () => {
      window.removeEventListener("resize", position);
      window.removeEventListener("scroll", position, true);
      window.visualViewport?.removeEventListener("resize", position);
      window.visualViewport?.removeEventListener("scroll", position);
      document.removeEventListener("pointerdown", outside);
    };
  }, [open, anchor, root, minWidth, maxHeight]);
  return placement;
};
