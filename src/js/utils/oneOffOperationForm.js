const isCalendarDate = (value) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return (
    !Number.isNaN(date.getTime()) &&
    date.getUTCFullYear() === Number(match[1]) &&
    date.getUTCMonth() + 1 === Number(match[2]) &&
    date.getUTCDate() === Number(match[3])
  );
};

export const validateOperation = (operation, categoryIds) => {
  const errors = {};
  const title = operation.title.trim();
  if (title.length < 2 || title.length > 50)
    errors.title = "Le titre doit contenir entre 2 et 50 caractères.";
  if (
    !/^(0|[1-9]\d{0,7})(?:\.\d{1,2})?$/.test(operation.amount) ||
    Number(operation.amount) <= 0
  )
    errors.amount = "Saisissez un montant positif avec deux décimales maximum.";
  if (!isCalendarDate(operation.operationDate))
    errors.operationDate = "Choisissez une date valide.";
  if (!categoryIds.has(Number(operation.categoryId)))
    errors.categoryId = "Choisissez une catégorie.";
  return errors;
};
