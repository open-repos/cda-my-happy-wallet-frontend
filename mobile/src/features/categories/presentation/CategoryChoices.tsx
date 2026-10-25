import { ChoiceList } from "@/src/design/ChoiceList";
import { OperationCategory } from "@/src/features/operations/domain/oneOffOperation";
import { CategoryMark } from "./CategoryMark";
interface Props {
  categories: OperationCategory[];
  value: number | null;
  disabled?: boolean;
  error?: string;
  onChange(value: number): void;
}
/** Existing personal category records and icon fallback, adapted to the shared list. */
export const CategoryChoices = ({ categories, ...props }: Props) => (
  <ChoiceList
    {...props}
    label="Catégorie"
    choices={categories.map((c) => ({ value: c.id, label: c.name }))}
    renderLeading={(choice) => (
      <CategoryMark category={categories.find((c) => c.id === choice.value)} />
    )}
  />
);
