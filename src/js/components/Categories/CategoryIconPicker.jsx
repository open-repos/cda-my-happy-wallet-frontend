import React, { useMemo, useState } from "react";
import { iconLabel, searchCategoryIcons } from "../../utils/categoryIcons";
import { useCategoryIconPack } from "./categoryIconPack";
import { CategoryMark } from "./CategoryLabel";

const Glyph = ({ definition }) => {
  const [width, height, path] = definition;
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width="1.5rem"
      height="1.5rem"
      aria-hidden="true"
      focusable="false"
    >
      <path fill="currentColor" d={path} />
    </svg>
  );
};

/**
 * Choix de l'icône Font Awesome d'une catégorie : recherche (mots-clés
 * français ou nom Font Awesome), aperçu dans la couleur choisie et retour à
 * la pastille avec « Sans icône ». Les options sont des boutons radio natifs :
 * flèches du clavier pour parcourir, Espace pour choisir.
 */
export const CategoryIconPicker = ({ value, onChange, name, color }) => {
  const { pack, failed, retry } = useCategoryIconPack();
  const [query, setQuery] = useState("");
  const results = useMemo(
    () => (pack ? searchCategoryIcons(query, [...pack.keys()]) : []),
    [pack, query]
  );
  const options = useMemo(() => {
    if (!pack) return [];
    // L'icône actuelle reste visible et cochée, même hors des résultats ou
    // retirée de la liste Web (elle s'affiche alors sans tracé).
    return value && !results.includes(value) ? [value, ...results] : results;
  }, [pack, results, value]);
  const unavailableLabel = "icône indisponible, pastille de couleur";
  const previewLabel =
    value && pack
      ? pack.has(value)
        ? `icône ${iconLabel(value)}`
        : unavailableLabel
      : "pastille de couleur";
  const displayName = name.trim() || "Nouvelle catégorie";
  const status = failed
    ? ""
    : pack === null
    ? "Chargement des icônes…"
    : results.length === 0
    ? `Aucune icône ne correspond à « ${query.trim()} ».`
    : `${results.length} icône${results.length > 1 ? "s" : ""} proposée${
        results.length > 1 ? "s" : ""
      }.`;

  const handleSearchKey = (event) => {
    // Entrée ne doit pas enregistrer la catégorie depuis la recherche.
    if (event.key === "Enter") event.preventDefault();
    // Échap vide d'abord la recherche, sans fermer le formulaire.
    if (event.key === "Escape" && query) {
      event.preventDefault();
      event.stopPropagation();
      setQuery("");
    }
  };

  return (
    <fieldset className="category-icons">
      <legend>Icône</legend>
      <div className="category-icons__header">
        <div className="category-icons__search">
          <label htmlFor="category-icon-search">Rechercher une icône</label>
          <input
            id="category-icon-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={handleSearchKey}
            autoComplete="off"
            aria-describedby="category-icon-search-help"
          />
          <span id="category-icon-search-help">
            En français (courses, santé…) ou par nom Font Awesome.
          </span>
        </div>
        <div
          className="category-icons__preview"
          role="img"
          aria-label={`Aperçu : ${displayName}, ${previewLabel}`}
        >
          <CategoryMark category={{ icon: value, color }} size="2rem" />
          <span aria-hidden="true">{displayName}</span>
        </div>
      </div>
      <label className="category-icon-option category-icon-option--none">
        <input
          type="radio"
          name="categoryIcon"
          checked={!value}
          onChange={() => onChange(null)}
        />
        Sans icône
      </label>
      {/* Région live permanente : chargement et nombre de résultats annoncés. */}
      <p className="category-icons__status" role="status">
        {status}
      </p>
      {failed && (
        <div className="category-icons__error" role="alert">
          <span>Les icônes n’ont pas pu être chargées.</span>
          <button
            type="button"
            className="one-off-button one-off-button--secondary"
            onClick={retry}
          >
            Réessayer
          </button>
        </div>
      )}
      {options.length > 0 && (
        <div className="category-icons__grid">
          {options.map((icon) => {
            const definition = pack.get(icon);
            const label = definition ? iconLabel(icon) : unavailableLabel;
            return (
              <label key={icon} className="category-icon-option" title={label}>
                <input
                  type="radio"
                  name="categoryIcon"
                  value={icon}
                  checked={value === icon}
                  onChange={() => onChange(icon)}
                />
                {definition ? (
                  <Glyph definition={definition} />
                ) : (
                  <CategoryMark category={{ color }} />
                )}
                <span className="sr-only">{label}</span>
              </label>
            );
          })}
        </div>
      )}
    </fieldset>
  );
};
