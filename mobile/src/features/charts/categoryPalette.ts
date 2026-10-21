/**
 * Rang de palette des catégories sans couleur propre, triées par identifiant
 * (#172) : le rang ne dépend ni des montants ni du tri. Règle commune à
 * l'accueil et aux analyses, identique au Web (`categoryPalette.js`).
 */
export const paletteRanks = (
  categories: { id: number; color: string | null }[],
): Map<number, number> =>
  new Map(
    categories
      .filter((category) => category.color == null)
      .sort((left, right) => left.id - right.id)
      .map((category, index) => [category.id, index]),
  );
