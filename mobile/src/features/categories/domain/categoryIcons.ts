import generated from "@/src/features/categories/domain/categoryIcons.json";

/**
 * Icônes de catégorie Font Awesome 6 Free (`<style>:<nom>`), dessinées par la
 * police `FontAwesome6` de `@expo/vector-icons`. Liste autorisée (backend
 * #84) et suggestions françaises générées par
 * `scripts/generate-category-icons.mjs`, identiques au Web.
 */
export const ALLOWED_CATEGORY_ICONS: readonly string[] = generated.icons;
export const SUGGESTED_CATEGORY_ICONS: readonly {
  icon: string;
  keywords: string[];
}[] = generated.suggestions;

const allowed = new Set(ALLOWED_CATEGORY_ICONS);
const STYLE_LABELS: Record<string, string> = {
  solid: "plein",
  regular: "contour",
};

const normalize = (value: string) =>
  value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

const nameOf = (icon: string) => icon.slice(icon.indexOf(":") + 1);

/**
 * Icônes correspondant à `query` : suggestions dont un mot-clé français
 * correspond, puis noms Font Awesome qui contiennent la recherche (ceux qui
 * commencent par elle en premier). Même règle que le Web.
 */
export const searchCategoryIcons = (query: string, limit = 48): string[] => {
  const text = normalize(query);
  if (!text) {
    return SUGGESTED_CATEGORY_ICONS.map(({ icon }) => icon).slice(0, limit);
  }
  const byKeyword = SUGGESTED_CATEGORY_ICONS.filter(({ keywords }) =>
    keywords.some((keyword) => normalize(keyword).includes(text)),
  ).map(({ icon }) => icon);
  const slug = text.replace(/\s+/g, "-");
  const byName = ALLOWED_CATEGORY_ICONS.filter((icon) =>
    nameOf(icon).includes(slug),
  ).sort(
    (left, right) =>
      Number(!nameOf(left).startsWith(slug)) -
        Number(!nameOf(right).startsWith(slug)) || left.localeCompare(right),
  );
  return [...new Set([...byKeyword, ...byName])].slice(0, limit);
};

/** « cart shopping (plein) » : nom lisible annoncé pour une icône. */
export const iconLabel = (icon: string): string => {
  const [style] = icon.split(":");
  return `${nameOf(icon).replace(/-/g, " ")} (${STYLE_LABELS[style] ?? style})`;
};

/**
 * Propriétés du composant `FontAwesome6`, ou `null` pour une icône absente ou
 * retirée de la liste (la pastille de couleur est alors affichée).
 */
export const fontAwesomeIcon = (
  icon: string | null | undefined,
): { name: string; solid: boolean } | null => {
  if (!icon || !allowed.has(icon)) return null;
  return { name: nameOf(icon), solid: icon.startsWith("solid:") };
};
