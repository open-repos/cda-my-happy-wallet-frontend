/**
 * Couleur des catégories dans les graphiques (#172), même règle que le mobile :
 * une catégorie garde sa couleur propre, sinon elle prend la palette du thème
 * au rang de son identifiant parmi les catégories sans couleur. Le rang ne
 * dépend ni des montants ni du tri, et l'accueil et les analyses concordent.
 */
export const paletteRanks = (categories) =>
  new Map(
    categories
      .filter((category) => category.color == null)
      .sort((left, right) => left.id - right.id)
      .map((category, index) => [category.id, index])
  );

/** Rang d'une catégorie ; inconnue ou colorée, elle vient après les autres. */
export const paletteIndexOf = (ranks, id) => ranks.get(id) ?? ranks.size;

/** Couleur de palette d'un rang, ou couleur de dépense sans palette chargée. */
export const paletteColor = (index, tokens) => {
  const palette = tokens.categories ?? [];
  return palette.length > 0 ? palette[index % palette.length] : tokens.expense;
};
