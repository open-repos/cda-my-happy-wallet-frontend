/**
 * Saisie décimale partagée par tous les champs de montant et de pourcentage.
 *
 * Accepte la virgule ou le point comme séparateur décimal, au plus deux
 * décimales, et des espaces de groupement (espace, insécable, fine insécable)
 * entre groupes de trois chiffres. Tout le reste est refusé : plusieurs
 * séparateurs, lettres, notation scientifique, signe `+`, ou `-` hors champ
 * signé. Le calcul se fait en centièmes entiers, sans arrondi flottant.
 */
const DECIMAL =
  /^(-)?(\d{1,3}(?:[ \u00a0\u202f]\d{3})+|\d+)(?:[.,](\d{1,2}))?$/;
const GROUP_SPACES = /[ \u00a0\u202f]/g;

/** Centièmes entiers de la saisie, ou `null` si elle est invalide. */
export const parseHundredths = (value, { signed = false } = {}) => {
  if (value === null || value === undefined) return null;
  const match = DECIMAL.exec(String(value).trim());
  if (!match) return null;
  const [, minus, whole, fraction = ""] = match;
  if (minus && !signed) return null;
  const result =
    Number(whole.replace(GROUP_SPACES, "")) * 100 +
    Number(fraction.padEnd(2, "0"));
  if (!Number.isSafeInteger(result)) return null;
  return minus && result !== 0 ? -result : result;
};

/** Décimal au point attendu par l'API, par exemple `1250` → `"12.50"`. */
export const hundredthsToDecimal = (hundredths) => {
  const sign = hundredths < 0 ? "-" : "";
  const absolute = Math.abs(hundredths);
  return `${sign}${Math.floor(absolute / 100)}.${String(
    absolute % 100
  ).padStart(2, "0")}`;
};

/** Montant strictement positif d'au plus 8 chiffres et deux décimales. */
export const isPositiveAmount = (value) => {
  const hundredths = parseHundredths(value);
  return hundredths !== null && hundredths > 0 && hundredths <= 9999999999;
};

/** Saisie normalisée au point avec deux décimales, ou `null`. */
export const normalizeDecimal = (value, options) => {
  const hundredths = parseHundredths(value, options);
  return hundredths === null ? null : hundredthsToDecimal(hundredths);
};
