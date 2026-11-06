import React from "react";
import { CategorySelect } from "../Categories/CategorySelect";
import { compatibleFixedCategories } from "../../utils/fixedCategories";

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
  return (
    <div className="fixed-inline__field fixed-category-select">
      <label htmlFor={id} className={compact ? undefined : "sr-only"}>
        Catégorie
      </label>
      <CategorySelect
        id={id}
        name="categoryId"
        form={form}
        value={value}
        onChange={onChange}
        categories={options}
        currentCategory={selected}
        placeholder="Non catégorisé"
        disabled={busy || source.status !== "success"}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
      />
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
        <span role="alert" id={`${id}-error`} className="fixed-inline__error">
          {error}
        </span>
      )}
    </div>
  );
};
