import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from "react-native";
import { primitives, semantic, themes } from "@/src/design/tokens";
import { OperationCategory } from "../domain/oneOffOperation";
import {
  appliedQueryMessage,
  countLabel,
  emptyOperationQuery,
  OperationQuery,
  OPERATION_SORT_CHOICES,
  validateOperationQuery,
} from "../domain/operationQuery";
import { OneOffOperationsGateway } from "../infrastructure/HttpOneOffOperationsGateway";
import { ListQueryModal, QueryFormState } from "./ListQueryModal";

export interface FilterChip {
  key: string;
  label: string;
  remove(): void;
}
export const useQueryAnnouncement = () => {
  const [announcement, setAnnouncement] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  const announce = useCallback((message: string) => {
    if (Platform.OS !== "web") {
      AccessibilityInfo.announceForAccessibility(message);
      return;
    }
    // Repeated messages still create a live-region change after each user action.
    setAnnouncement("");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setAnnouncement(message), 0);
  }, []);
  return { announcement, announce };
};

export const ListQueryToolbar = ({
  chips,
  sortText,
  disabled,
  onOpen,
  onClear,
  announcement,
}: {
  chips: FilterChip[];
  sortText: string;
  disabled: boolean;
  onOpen(): void;
  onClear(): void;
  announcement: string;
}) => {
  const colors = themes[useColorScheme() === "dark" ? "dark" : "light"].color;
  const styles = makeStyles(colors);
  return (
    <View style={styles.toolbar}>
      {Platform.OS === "web" && (
        <Text
          testID="list-query-announcement"
          accessibilityLiveRegion="polite"
          style={styles.announcement}
        >
          {announcement}
        </Text>
      )}
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled }}
        disabled={disabled}
        accessibilityLabel={`Trier et filtrer (${countLabel(chips.length, "filtre")})`}
        onPress={onOpen}
        style={styles.button}
      >
        <Text style={styles.buttonText}>
          Trier et filtrer{chips.length ? ` (${chips.length})` : ""}
        </Text>
      </Pressable>
      <Text style={styles.summary}>Tri : {sortText}.</Text>
      {chips.map((chip) => (
        <Pressable
          key={chip.key}
          accessibilityRole="button"
          accessibilityLabel={`Retirer le filtre ${chip.label}`}
          accessibilityState={{ disabled }}
          disabled={disabled}
          onPress={chip.remove}
          style={styles.chip}
        >
          <Text style={styles.summary}>{chip.label} ×</Text>
        </Pressable>
      ))}
      {chips.length > 0 && (
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled }}
          disabled={disabled}
          onPress={onClear}
          style={styles.chip}
        >
          <Text style={styles.summary}>Effacer les filtres</Text>
        </Pressable>
      )}
    </View>
  );
};

export const OperationQueryControls = ({
  query,
  onChange,
  categories,
  gateway,
  disabled,
}: {
  query: OperationQuery;
  onChange(query: OperationQuery): void;
  categories: OperationCategory[];
  gateway: OneOffOperationsGateway;
  disabled: boolean;
}) => {
  const [open, setOpen] = useState(false);
  const { announcement, announce } = useQueryAnnouncement();
  const loadTitles = useCallback<
    OneOffOperationsGateway["listTitleSuggestions"]
  >((request) => gateway.listTitleSuggestions(request), [gateway]);
  const sortTextOf = (q: OperationQuery) =>
    q.sort
      ? `${OPERATION_SORT_CHOICES.find((choice) => choice.value === q.sort?.field)?.label}, ${q.sort.order === "asc" ? "croissant" : "décroissant"}`
      : "date, plus récentes d’abord (par défaut)";
  const sortText = sortTextOf(query);
  const apply = (next: OperationQuery, message?: string) => {
    if (JSON.stringify(next) === JSON.stringify(query)) return;
    onChange(next);
    announce(message ?? "Tri et filtres des opérations mis à jour.");
  };
  // Puces d'une requête : affichées pour la requête courante, lues pour
  // annoncer celle qui vient d'être appliquée.
  const chipsOf = (q: OperationQuery): FilterChip[] => {
    const chips: FilterChip[] = [];
    for (const [key, label] of [
      ["title", "Libellé"],
      ["from", "Du"],
      ["to", "Au"],
      ["minAmount", "Minimum"],
      ["maxAmount", "Maximum"],
    ] as const) {
      if (q[key])
        chips.push({
          key,
          label: `${label} : ${q[key]}`,
          remove: () => apply({ ...q, [key]: "" }, `Filtre ${label} retiré.`),
        });
    }
    if (q.type)
      chips.push({
        key: "type",
        label: q.type === "ENTREE" ? "Entrées" : "Dépenses",
        remove: () => apply({ ...q, type: "" }, "Filtre de type retiré."),
      });
    if (q.categoryIds.length)
      chips.push({
        key: "categories",
        label: `Catégories : ${q.categoryIds.map((id) => categories.find((category) => category.id === id)?.name ?? `Catégorie ${id}`).join(", ")}`,
        remove: () =>
          apply({ ...q, categoryIds: [] }, "Filtre de catégories retiré."),
      });
    return chips;
  };
  const chips = chipsOf(query);
  const initial: QueryFormState = {
    sortField: query.sort?.field ?? "",
    order: query.sort?.order ?? "desc",
    title: query.title,
    categoryIds: query.categoryIds.map(String),
    kind: query.type,
    period: "",
    from: query.from,
    to: query.to,
    minAmount: query.minAmount,
    maxAmount: query.maxAmount,
  };
  const categoryChoices = useMemo(
    () =>
      categories
        .map((category) => ({
          value: String(category.id),
          label: category.name,
        }))
        .sort((a, b) =>
          a.label.localeCompare(b.label, "fr", { sensitivity: "base" }),
        ),
    [categories],
  );
  return (
    <>
      <ListQueryToolbar
        chips={chips}
        sortText={sortText}
        disabled={disabled}
        announcement={announcement}
        onOpen={() => setOpen(true)}
        onClear={() =>
          apply(
            { ...emptyOperationQuery(), sort: query.sort },
            "Filtres effacés. Le tri est conservé.",
          )
        }
      />
      {open && (
        <ListQueryModal
          initial={initial}
          defaultSortLabel="Par défaut (date décroissante)"
          sortChoices={OPERATION_SORT_CHOICES}
          categories={categoryChoices}
          categoryLimit={20}
          typeChoices={[
            { value: "DEPENSE", label: "Dépenses" },
            { value: "ENTREE", label: "Entrées" },
          ]}
          loadTitles={loadTitles}
          onClose={() => setOpen(false)}
          onApply={(draft) => {
            const field = OPERATION_SORT_CHOICES.find(
              (choice) => choice.value === draft.sortField,
            )?.value;
            const next: OperationQuery = {
              sort: field ? { field, order: draft.order } : null,
              from: draft.from,
              to: draft.to,
              title: draft.title,
              categoryIds: draft.categoryIds.map(Number),
              type:
                draft.kind === "DEPENSE" || draft.kind === "ENTREE"
                  ? draft.kind
                  : "",
              minAmount: draft.minAmount,
              maxAmount: draft.maxAmount,
            };
            const errors = Object.values(validateOperationQuery(next));
            if (!errors.length) {
              apply(
                next,
                appliedQueryMessage(
                  "Tri et filtres appliqués",
                  sortTextOf(next),
                  chipsOf(next).map((chip) => chip.label),
                ),
              );
              setOpen(false);
            }
            return errors;
          }}
        />
      )}
    </>
  );
};
const makeStyles = (
  colors: typeof themes.light.color | typeof themes.dark.color,
) =>
  StyleSheet.create({
    toolbar: {
      gap: primitives.space["2"],
      marginBottom: primitives.space["4"],
    },
    button: {
      minHeight: semantic.size.controlMinHeight,
      minWidth: semantic.size.controlMinHeight,
      padding: primitives.space["3"],
      borderRadius: semantic.radius.control,
      backgroundColor: colors.actionSecondaryBackground,
      justifyContent: "center",
      alignSelf: "flex-start",
    },
    buttonText: {
      fontSize: primitives.fontSize.md,
      color: colors.actionSecondaryText,
      fontWeight: "600",
    },
    chip: {
      minHeight: semantic.size.controlMinHeight,
      minWidth: semantic.size.controlMinHeight,
      borderRadius: semantic.radius.control,
      borderColor: colors.borderSubtle,
      borderWidth: semantic.borderWidth.default,
      padding: primitives.space["3"],
      justifyContent: "center",
    },
    summary: {
      fontSize: primitives.fontSize.sm,
      color: colors.textSecondary,
      flexShrink: 1,
    },
    announcement: {
      position: "absolute",
      width: 1,
      height: 1,
      overflow: "hidden",
    },
  });
