import React from "react";
import { ChoiceSelect } from "../Fields/ChoiceSelect";
import { CategoryLabel } from "./CategoryLabel";

/** Domain adapter: existing category records and form change-event contract. */
export const CategorySelect = ({
  categories,
  value,
  currentCategory,
  placeholder = "Choisir une catégorie",
  ...props
}) => {
  const choices = [{ id: "", name: placeholder }, ...categories];
  if (
    value !== "" &&
    value != null &&
    !choices.some((category) => String(category.id) === String(value))
  )
    choices.push({
      id: value,
      name: "Catégorie indisponible",
      ...currentCategory,
    });
  return (
    <ChoiceSelect
      name="categoryId"
      aria-label="Catégorie"
      {...props}
      value={value}
      options={choices.map((category) => ({
        value: String(category.id),
        label: category.name,
        category,
      }))}
      renderOption={({ category }) => <CategoryLabel category={category} />}
    />
  );
};
