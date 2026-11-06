import { useCallback, useEffect, useState } from "react";

export const NAVIGATION_STORAGE_KEY = "mhw-navigation";

const readCollapsed = () => {
  try {
    return window.localStorage.getItem(NAVIGATION_STORAGE_KEY) === "collapsed";
  } catch {
    return false;
  }
};

/** Desktop rail state: icons only when collapsed, remembered per browser. */
export const useNavigationCollapse = () => {
  const [collapsed, setCollapsed] = useState(readCollapsed);
  useEffect(() => {
    const root = document.documentElement;
    // The page offset follows --atelier-navigation-width on this attribute.
    if (collapsed) root.setAttribute("data-navigation", "collapsed");
    else root.removeAttribute("data-navigation");
    try {
      window.localStorage.setItem(
        NAVIGATION_STORAGE_KEY,
        collapsed ? "collapsed" : "expanded"
      );
    } catch {
      // The layout still changes when storage is unavailable.
    }
    return () => root.removeAttribute("data-navigation");
  }, [collapsed]);
  const toggle = useCallback(() => setCollapsed((value) => !value), []);
  const expand = useCallback(() => setCollapsed(false), []);
  return { collapsed, toggle, expand };
};
