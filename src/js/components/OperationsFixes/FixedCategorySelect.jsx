import React from "react";
import { CategoryMark } from "../Categories/CategoryLabel";
import {
  compatibleFixedCategories,
  fixedCategory,
} from "../../utils/fixedCategories";

export const FixedCategorySelect = ({
  id,
  form,
  kind,
  value,
  onChange,
  source,
  currentCategory,
  busy,
  error,
  compact = true,
}) => {
  const options = compatibleFixedCategories(source.categories, kind);
  const selected =
    options.find((category) => String(category.id) === String(value)) ??
    currentCategory;
  const missing =
    value !== "" &&
    !options.some((category) => String(category.id) === String(value));
  return (
    <div className="fixed-inline__field fixed-category-select">
      <label htmlFor={id} className={compact ? undefined : "sr-only"}>
        Catégorie
      </label>
      <div className="fixed-category-select__control">
        <CategoryMark category={value === "" ? fixedCategory({}) : selected} />
        <select
          id={id}
          name="categoryId"
          form={form}
          value={value}
          onChange={onChange}
          disabled={busy || source.status !== "success"}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
        >
          <option value="">Non catégorisé</option>
          {missing && (
            <option value={value}>
              {selected?.name ?? "Catégorie indisponible"}
            </option>
          )}
          {options.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </div>
      {source.status === "loading" && (
        <span className="fixed-category-select__notice">
          Chargement des catégories…
        </span>
      )}
      {source.status === "error" && (
        <>
          <span className="fixed-category-select__notice">
            Catégories indisponibles. Votre choix est conservé.
          </span>
          <button
            type="button"
            className="one-off-button one-off-button--secondary"
            disabled={busy}
            onClick={source.retry}
          >
            Réessayer les catégories
          </button>
        </>
      )}
      {error && (
        <span id={`${id}-error`} className="fixed-inline__error">
          {error}
        </span>
      )}
    </div>
  );
};
