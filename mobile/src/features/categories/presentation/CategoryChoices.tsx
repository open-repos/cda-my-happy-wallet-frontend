import { ChoiceList } from "@/src/design/ChoiceList";
import { OperationCategory } from "@/src/features/operations/domain/oneOffOperation";
import { CategoryMark } from "./CategoryMark";

/** Valeur interne du choix « aucune catégorie » (identifiants backend > 0). */
const NONE = 0;
/** Icône étiquette du Web pour « Non catégorisé » (#266). */
const NONE_MARK = { color: null, icon: "solid:tag" };

interface Props {
  categories: OperationCategory[];
  value: number | null;
  disabled?: boolean;
  error?: string;
  /** Ajoute en tête un choix sans catégorie, qui renvoie `null`. */
  noneLabel?: string;
  onChange(value: number | null): void;
}
/** Existing personal category records and icon fallback, adapted to the shared list. */
export const CategoryChoices = ({
  categories,
  value,
  noneLabel,
  onChange,
  ...props
}: Props) => (
  <ChoiceList
    {...props}
    label="Catégorie"
    value={value ?? (noneLabel == null ? null : NONE)}
    choices={[
      ...(noneLabel == null ? [] : [{ value: NONE, label: noneLabel }]),
      ...categories.map((c) => ({ value: c.id, label: c.name })),
    ]}
    onChange={(choice) => onChange(choice === NONE ? null : choice)}
    renderLeading={(choice) => (
      <CategoryMark
        category={
          choice.value === NONE
            ? NONE_MARK
            : categories.find((c) => c.id === choice.value)
        }
      />
    )}
  />
);
