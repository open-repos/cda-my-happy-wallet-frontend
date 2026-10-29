import { useEffect, useState } from "react";

/** True while the user scrolls a matching container down; scrolling up,
 * reaching its end or changing `resetKey` brings the element back. */
export const useHideOnScroll = (rootRef, selector, resetKey) => {
  const [away, setAway] = useState(false);
  useEffect(() => setAway(false), [resetKey]);
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;
    const last = new WeakMap();
    // Scroll does not bubble: capture it, as pages replace the container.
    const onScroll = (event) => {
      const scroller = event.target;
      if (!(scroller instanceof Element) || !scroller.matches(selector)) return;
      const top = scroller.scrollTop;
      const previous = last.get(scroller) ?? top;
      const atEnd = top + scroller.clientHeight >= scroller.scrollHeight - 8;
      if (atEnd || top < previous - 4) setAway(false);
      else if (top > previous + 4) setAway(true);
      last.set(scroller, top);
    };
    root.addEventListener("scroll", onScroll, { capture: true, passive: true });
    return () =>
      root.removeEventListener("scroll", onScroll, { capture: true });
  }, [rootRef, selector]);
  return away;
};
