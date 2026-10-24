export const fixedCategory = (row) =>
  row.category ?? {
    name: row.categoryId == null ? "Non catégorisé" : "Catégorie indisponible",
    color: null,
    icon: "solid:tag",
  };
export const compatibleFixedCategories = (categories, kind) =>
  categories.filter(
    (category) =>
      category.fixedKind == null ||
      category.fixedKind === (kind === "income" ? "REVENU" : "CHARGE")
  );
export const fixedCategoryBody = (values) =>
  values.categoryId === undefined
    ? {}
    : {
        categoryId: values.categoryId === "" ? null : Number(values.categoryId),
      };
export const validateFixedCategory = (values, source, kind) => {
  if (!source || values.categoryId === "" || values.categoryId === undefined)
    return null;
  const id = Number(values.categoryId);
  if (
    !Number.isSafeInteger(id) ||
    id < 1 ||
    (source.status === "success" &&
      !compatibleFixedCategories(source.categories, kind).some(
        (category) => category.id === id
      ))
  )
    return "Cette catégorie n’est plus disponible. Choisissez-en une autre.";
  return null;
};
