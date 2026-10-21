import {
  fontAwesomeIcon,
  iconLabel,
  searchCategoryIcons,
} from "@/src/features/categories/domain/categoryIcons";

/** Feedback and options stay separate: a pinned selection is not a match. */
export const getCategoryIconPickerState = (
  query: string,
  value: string | null,
) => {
  const results = searchCategoryIcons(query);
  const icons =
    value && !results.includes(value) ? [value, ...results] : results;
  const unavailableLabel = "icône indisponible, pastille de couleur";
  const previewLabel = value
    ? fontAwesomeIcon(value)
      ? `icône ${iconLabel(value)}`
      : unavailableLabel
    : "pastille de couleur";
  const status =
    results.length === 0
      ? `Aucune icône ne correspond à « ${query.trim()} ».`
      : `${results.length} icône${results.length > 1 ? "s" : ""} proposée${
          results.length > 1 ? "s" : ""
        }.`;
  return {
    previewLabel,
    status,
    options: icons.map((icon) => ({
      icon,
      label: fontAwesomeIcon(icon) ? iconLabel(icon) : unavailableLabel,
    })),
  };
};
