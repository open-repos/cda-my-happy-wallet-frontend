import { useEffect, useState } from "react";

const matches = (query) =>
  typeof window !== "undefined" && Boolean(window.matchMedia?.(query).matches);

/** Suit une media query ; sans `matchMedia` (jsdom), renvoie `false`. */
export const useMediaQuery = (query) => {
  const [value, setValue] = useState(() => matches(query));
  useEffect(() => {
    const list = window.matchMedia?.(query);
    if (!list) return undefined;
    const update = () => setValue(list.matches);
    update();
    list.addEventListener?.("change", update);
    return () => list.removeEventListener?.("change", update);
  }, [query]);
  return value;
};

/** Même seuil que `CompactMoneyList.css` : en dessous, le tableau devient une
 * liste de cartes et ses en-têtes sont masqués. */
export const WIDE_TABLE_QUERY = "(min-width: 64rem)";
