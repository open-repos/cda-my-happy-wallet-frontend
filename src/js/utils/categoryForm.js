import tokens from "../../../design-tokens/tokens.json";

const color = tokens.primitive.color;

/**
 * Couleurs proposées aux catégories : primitives du design system, dont la
 * valeur est stockée telle quelle par l'API (elle ne suit pas le thème).
 */
export const CATEGORY_PALETTE = [
  { label: "Vert", value: color.green800 },
  { label: "Bleu", value: color.blue600 },
  { label: "Corail", value: color.coral500 },
  { label: "Orange", value: color.orange400 },
  { label: "Moutarde", value: color.yellow800 },
  { label: "Rouge", value: color.red700 },
  { label: "Kaki", value: color.green700 },
  { label: "Ardoise", value: color.neutral700 },
];

const HEX_COLOR = /^#[0-9A-F]{6}$/i;

export const validateCategory = ({ name, color: value }) => {
  const errors = {};
  const trimmed = name.trim();
  if (trimmed.length < 2 || trimmed.length > 50) {
    errors.name = "Le nom doit contenir entre 2 et 50 caractères.";
  }
  if (value && !HEX_COLOR.test(value)) {
    errors.color = "Choisissez une couleur au format #RRGGBB.";
  }
  return errors;
};

/** `icon` absent (`undefined`) : non transmis, le backend la conserve. */
export const toCategoryPayload = ({ name, color: value, icon }) => ({
  name: name.trim(),
  color: value ? value.toUpperCase() : null,
  ...(icon === undefined ? {} : { icon }),
});
