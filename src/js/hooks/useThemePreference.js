import { useCallback, useEffect, useState } from "react";
import {
  applyThemePreference,
  DARK_SCHEME_QUERY,
  readThemePreference,
  resolveTheme,
  THEME_CHANGE_EVENT,
} from "../design/theme";

/** Shared theme state: the theme actually displayed and how to change it. */
export const useThemePreference = () => {
  const [theme, setTheme] = useState(() => resolveTheme(readThemePreference()));
  useEffect(() => {
    const sync = () => setTheme(resolveTheme(readThemePreference()));
    const media = window.matchMedia?.(DARK_SCHEME_QUERY);
    window.addEventListener(THEME_CHANGE_EVENT, sync);
    media?.addEventListener?.("change", sync);
    return () => {
      window.removeEventListener(THEME_CHANGE_EVENT, sync);
      media?.removeEventListener?.("change", sync);
    };
  }, []);
  const choose = useCallback((next) => applyThemePreference(next), []);
  return { theme, choose };
};
