import React from "react";
import { useCategoryIconPack } from "./categoryIconPack";
import "../../../css/CategoryLabel.css";

/**
 * Icône d'une catégorie dans sa couleur, décorative : le nom affiché à côté
 * porte le sens. Sans icône (ou avant son chargement), pastille de couleur.
 */
export const CategoryMark = ({ category, size = "1.25rem" }) => {
  const { pack } = useCategoryIconPack(Boolean(category?.icon));
  const definition = category?.icon ? pack?.get(category.icon) : undefined;
  if (definition) {
    const [width, height, path] = definition;
    return (
      <svg
        className="category-icon"
        viewBox={`0 0 ${width} ${height}`}
        width={size}
        height={size}
        style={{
          color: category.color ?? "var(--ds-color-text-secondary)",
        }}
        aria-hidden="true"
        focusable="false"
      >
        <path fill="currentColor" d={path} />
      </svg>
    );
  }
  return (
    <span
      className={`category-swatch${
        category?.color ? "" : " category-swatch--none"
      }`}
      style={category?.color ? { backgroundColor: category.color } : {}}
      aria-hidden="true"
    />
  );
};

/** Nom de la catégorie précédé de son icône ou de sa pastille. */
export const CategoryLabel = ({ category }) => (
  <span className="category-label">
    <CategoryMark category={category} />
    {category?.name || "Catégorie indisponible"}
  </span>
);
