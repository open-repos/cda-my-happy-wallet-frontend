import { ConfirmDialog } from "../Forms/ConfirmDialog";
import { ActionButton } from "../Actions/ActionButton";
import { useFormFocus } from "../../hooks/useFormFocus";
import React, { useEffect, useRef, useState } from "react";
import tokens from "../../../../design-tokens/tokens.json";
import {
  CATEGORY_PALETTE,
  toCategoryPayload,
  validateCategory,
} from "../../utils/categoryForm";
import { CategoryIconPicker } from "./CategoryIconPicker";
const NO_COLOR = "none";
const CUSTOM_COLOR = "custom";
const DEFAULT_CUSTOM_COLOR = tokens.primitive.color.neutral700.toLowerCase();
const initialChoice = (color) => {
  if (!color)
    return {
      choice: NO_COLOR,
      customColor: DEFAULT_CUSTOM_COLOR,
    };
  const swatch = CATEGORY_PALETTE.find(
    ({ value }) => value.toUpperCase() === color.toUpperCase()
  );
  return swatch
    ? {
        choice: swatch.value,
        customColor: DEFAULT_CUSTOM_COLOR,
      }
    : {
        choice: CUSTOM_COLOR,
        customColor: color.toLowerCase(),
      };
};
const selectedColor = ({ choice, customColor }) => {
  if (choice === NO_COLOR) return null;
  return choice === CUSTOM_COLOR ? customColor : choice;
};
export const CategoryForm = ({
  category,
  isSaving,
  onCancel,
  onDelete,
  onSave,
}) => {
  const [name, setName] = useState(category?.name ?? "");
  const [color, setColor] = useState(() => initialChoice(category?.color));
  const [icon, setIcon] = useState(category?.icon ?? null);
  const [errors, setErrors] = useState({});
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const nameRef = useRef(null);
  useFormFocus(nameRef);
  useEffect(() => {
    const closeOnEscape = (event) => {
      if (event.key === "Escape" && !isSaving) onCancel();
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [isSaving, onCancel]);
  const submit = async (event) => {
    event.preventDefault();
    // Icône inchangée : non renvoyée, pour qu'une icône retirée depuis de la
    // liste autorisée n'empêche pas de renommer la catégorie.
    const unchanged = category && icon === (category.icon ?? null);
    const values = {
      name,
      color: selectedColor(color),
      icon: unchanged ? undefined : icon,
    };
    const validationErrors = validateCategory(values);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) {
      // Le message, relié par `aria-describedby`, est lu avec le champ.
      if (validationErrors.name) nameRef.current?.focus();
      return;
    }
    const result = await onSave(toCategoryPayload(values));
    if (result?.code === "CATEGORY_NAME_CONFLICT") {
      setErrors({
        name: "Une catégorie porte déjà ce nom.",
      });
      nameRef.current?.focus();
    }
  };
  const describedBy = (field) =>
    errors[field] ? `category-${field}-error` : undefined;
  return (
    <section
      className="one-off-form-panel"
      aria-labelledby="category-form-title"
    >
      <div className="one-off-form-panel__header">
        <h2 id="category-form-title">
          {category ? "Modifier la catégorie" : "Ajouter une catégorie"}
        </h2>
        <button
          type="button"
          className="one-off-icon-button"
          onClick={onCancel}
          disabled={isSaving}
          aria-label="Fermer le formulaire"
        >
          ×
        </button>
      </div>
      <form className="category-form" onSubmit={submit} noValidate>
        <div className="category-form__name">
          <label htmlFor="category-name">Nom</label>
          <input
            ref={nameRef}
            id="category-name"
            name="name"
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              setErrors((current) => ({
                ...current,
                name: undefined,
              }));
            }}
            maxLength={50}
            autoComplete="off"
            aria-invalid={Boolean(errors.name)}
            aria-describedby={describedBy("name")}
          />
          {errors.name && (
            <span id="category-name-error" className="category-form__error">
              {errors.name}
            </span>
          )}
        </div>
        <fieldset
          className="category-colors"
          aria-describedby={describedBy("color")}
        >
          <legend>Couleur</legend>
          <label className="category-color-option">
            <input
              type="radio"
              name="categoryColor"
              value={NO_COLOR}
              checked={color.choice === NO_COLOR}
              onChange={() =>
                setColor((current) => ({
                  ...current,
                  choice: NO_COLOR,
                }))
              }
            />
            <span
              className="category-swatch category-swatch--none"
              aria-hidden="true"
            />
            Sans couleur
          </label>
          {CATEGORY_PALETTE.map((swatch) => (
            <label key={swatch.value} className="category-color-option">
              <input
                type="radio"
                name="categoryColor"
                value={swatch.value}
                checked={color.choice === swatch.value}
                onChange={() =>
                  setColor((current) => ({
                    ...current,
                    choice: swatch.value,
                  }))
                }
              />
              <span
                className="category-swatch"
                style={{
                  backgroundColor: swatch.value,
                }}
                aria-hidden="true"
              />
              {swatch.label}
            </label>
          ))}
          <label className="category-color-option">
            <input
              type="radio"
              name="categoryColor"
              value={CUSTOM_COLOR}
              checked={color.choice === CUSTOM_COLOR}
              onChange={() =>
                setColor((current) => ({
                  ...current,
                  choice: CUSTOM_COLOR,
                }))
              }
            />
            <span
              className="category-swatch"
              style={{
                backgroundColor: color.customColor,
              }}
              aria-hidden="true"
            />
            Autre couleur
          </label>
          {color.choice === CUSTOM_COLOR && (
            <label className="category-form__custom">
              Couleur personnalisée
              <input
                type="color"
                value={color.customColor}
                onChange={(event) =>
                  setColor((current) => ({
                    ...current,
                    customColor: event.target.value,
                  }))
                }
              />
            </label>
          )}
          {errors.color && (
            <span id="category-color-error" className="category-form__error">
              {errors.color}
            </span>
          )}
        </fieldset>
        <CategoryIconPicker
          value={icon}
          onChange={setIcon}
          name={name}
          color={selectedColor(color)}
        />
        <div className="one-off-form__actions">
          {category && (
            <ActionButton
              action="delete"
              type="button"
              className="one-off-button one-off-button--danger"
              onClick={() => setIsConfirmingDelete(true)}
              disabled={isSaving}
              variant="danger"
            >
              Supprimer
            </ActionButton>
          )}
          {category && isConfirmingDelete && (
            <ConfirmDialog
              label={`Supprimer « ${category.name} » ?`}
              busy={isSaving}
              onCancel={() => setIsConfirmingDelete(false)}
            >
              <div className="one-off-delete-confirmation">
                <span>Supprimer « {category.name} » ?</span>
                <ActionButton
                  action="cancel"
                  type="button"
                  onClick={() => setIsConfirmingDelete(false)}
                  disabled={isSaving}
                >
                  Annuler
                </ActionButton>
                <ActionButton
                  action="delete"
                  type="button"
                  onClick={onDelete}
                  disabled={isSaving}
                >
                  Oui, supprimer
                </ActionButton>
              </div>
            </ConfirmDialog>
          )}
          <ActionButton
            action="cancel"
            type="button"
            className="one-off-button one-off-button--secondary"
            onClick={onCancel}
            disabled={isSaving}
          >
            Annuler
          </ActionButton>
          <ActionButton
            action="save"
            type="submit"
            className="one-off-button"
            disabled={isSaving}
            busy={isSaving}
          >
            {isSaving ? "Enregistrement…" : "Enregistrer"}
          </ActionButton>
        </div>
      </form>
    </section>
  );
};
