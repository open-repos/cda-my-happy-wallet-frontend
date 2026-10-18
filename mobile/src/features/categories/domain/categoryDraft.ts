import { primitives } from "@/src/design/tokens";

const color = primitives.color;

/**
 * Couleurs proposées aux catégories, identiques au Web : primitives du
 * design system, stockées telles quelles par l'API.
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
] as const;

export interface CategoryDraft {
  name: string;
  color: string | null;
  /** `undefined` : icône inchangée, non transmise (le backend la conserve). */
  icon?: string | null;
}

export type CategoryDraftErrors = Partial<Record<"name" | "color", string>>;

/** Code d'erreur stable de l'API, `null` pour une panne réseau. */
export type CategoryErrorCode =
  | "CATEGORY_NAME_CONFLICT"
  | "CATEGORY_IN_USE"
  | "CATEGORY_NOT_FOUND"
  | (string & {})
  | null;

const HEX_COLOR = /^#[0-9A-F]{6}$/i;

export const validateCategoryDraft = (
  draft: CategoryDraft,
): CategoryDraftErrors => {
  const errors: CategoryDraftErrors = {};
  const name = draft.name.trim();
  if (name.length < 2 || name.length > 50) {
    errors.name = "Le nom doit contenir entre 2 et 50 caractères.";
  }
  if (draft.color && !HEX_COLOR.test(draft.color)) {
    errors.color = "Saisissez une couleur au format #RRGGBB.";
  }
  return errors;
};

/**
 * Corps envoyé à l'API. `icon` n'est transmis que s'il a été choisi : une
 * icône inchangée (même retirée de la liste depuis) n'empêche pas de renommer.
 */
export const toCategoryPayload = (draft: CategoryDraft): CategoryDraft => ({
  name: draft.name.trim(),
  color: draft.color ? draft.color.toUpperCase() : null,
  ...(draft.icon === undefined ? {} : { icon: draft.icon }),
});

const messages: Record<string, string> = {
  CATEGORY_NAME_CONFLICT:
    "Une catégorie porte déjà ce nom. Choisissez-en un autre.",
  CATEGORY_IN_USE:
    "Cette catégorie est utilisée par des opérations : modifiez-les avant de la supprimer.",
  CATEGORY_NOT_FOUND: "Cette catégorie n’existe plus. La liste est actualisée.",
  INVALID_CATEGORY_ICON:
    "Cette icône n’est plus disponible. Choisissez-en une autre ou « Sans icône ».",
};

export const categoryErrorMessage = (code: CategoryErrorCode): string =>
  (code != null ? messages[code] : undefined) ??
  "La catégorie n’a pas pu être enregistrée. Réessayez.";
