import { useEffect, useState } from "react";

const bounds = () => ({
  height: window.visualViewport?.height ?? window.innerHeight,
  top: window.visualViewport?.offsetTop ?? 0,
});

/** Keep a dialog inside the visible viewport when a software keyboard opens. */
export const useViewportBounds = () => {
  const [viewport, setViewport] = useState(bounds);
  useEffect(() => {
    const update = () => setViewport(bounds());
    const visual = window.visualViewport;
    window.addEventListener("resize", update);
    visual?.addEventListener("resize", update);
    visual?.addEventListener("scroll", update);
    update();
    return () => {
      window.removeEventListener("resize", update);
      visual?.removeEventListener("resize", update);
      visual?.removeEventListener("scroll", update);
    };
  }, []);
  return {
    "--quick-add-viewport-height": `${viewport.height}px`,
    "--quick-add-viewport-top": `${viewport.top}px`,
  };
};
