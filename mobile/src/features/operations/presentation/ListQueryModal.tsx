import { useEffect, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useColorScheme,
  View,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { ChoiceList } from "@/src/design/ChoiceList";
import { FeedbackState } from "@/src/design/FeedbackState";
import { primitives, semantic, themes } from "@/src/design/tokens";
import { CollectionPage } from "../domain/oneOffOperation";
import { foldQueryText, SortOrder } from "../domain/operationQuery";
import {
  TitleSuggestion,
  TitleSuggestionsRequest,
} from "../infrastructure/HttpOneOffOperationsGateway";

export interface QueryFormState {
  sortField: string;
  order: SortOrder;
  title: string;
  categoryIds: string[];
  kind: string;
  period: string;
  from: string;
  to: string;
  minAmount: string;
  maxAmount: string;
}
export interface QueryOption {
  value: string;
  label: string;
}
interface Props {
  initial: QueryFormState;
  sortChoices: readonly QueryOption[];
  defaultSortLabel: string;
  categories: readonly QueryOption[];
  categoryLimit?: number;
  typeChoices: readonly QueryOption[];
  periods?: readonly QueryOption[];
  localTitles?: readonly string[];
  loadTitles?(
    request: TitleSuggestionsRequest,
  ): Promise<CollectionPage<TitleSuggestion>>;
  onApply(draft: QueryFormState): string[];
  onClose(): void;
}

const useQueryStyles = () => {
  const colors = themes[useColorScheme() === "dark" ? "dark" : "light"].color;
  return { colors, styles: makeStyles(colors) };
};

export const QueryChoiceField = ({
  label,
  choices,
  value,
  onChange,
  disabled = false,
}: {
  label: string;
  choices: readonly QueryOption[];
  value: string;
  onChange(value: string): void;
  disabled?: boolean;
}) => {
  const [expanded, setExpanded] = useState(false);
  const { styles } = useQueryStyles();
  return (
    <View style={styles.field}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label} : ${choices.find((option) => option.value === value)?.label ?? "Tous"}`}
        accessibilityState={{ expanded, disabled }}
        disabled={disabled}
        onPress={() => setExpanded((current) => !current)}
        style={styles.control}
      >
        <Text style={styles.text}>
          {label} :{" "}
          {choices.find((option) => option.value === value)?.label ?? "Tous"}
        </Text>
        <Text accessible={false} style={styles.text}>
          {expanded ? "−" : "+"}
        </Text>
      </Pressable>
      {expanded && (
        <ChoiceList
          label={label}
          choices={[...choices]}
          value={value}
          onChange={(next) => {
            onChange(next);
            setExpanded(false);
          }}
        />
      )}
    </View>
  );
};

const TitleFilter = ({
  value,
  onChange,
  localTitles,
  loadTitles,
}: Pick<Props, "localTitles" | "loadTitles"> & {
  value: string;
  onChange(value: string): void;
}) => {
  const { colors, styles } = useQueryStyles();
  const [text, setText] = useState(value);
  const committedText = useRef(value);
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<TitleSuggestion[]>([]);
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading",
  );
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasNext, setHasNext] = useState(false);
  const [retry, setRetry] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const controller = useRef<AbortController | null>(null);
  const version = useRef(0);
  const seenCursors = useRef(new Set<string>());
  useEffect(() => {
    if (!open) return;
    const requestVersion = ++version.current;
    const abort = new AbortController();
    controller.current = abort;
    const resetTimer = setTimeout(() => {
      setOptions([]);
      setStatus("loading");
      setHasNext(false);
      setLoadingMore(false);
    }, 0);
    seenCursors.current.clear();
    const timer = setTimeout(
      () => {
        const request = loadTitles
          ? loadTitles({ query: text, signal: abort.signal })
          : Promise.resolve({
              data: (localTitles ?? [])
                .filter((title) =>
                  foldQueryText(title).includes(foldQueryText(text.trim())),
                )
                .map((title) => ({ value: title, label: title })),
              meta: { hasNext: false, nextCursor: null, limit: 10 },
            });
        void request
          .then((page) => {
            if (abort.signal.aborted || version.current !== requestVersion)
              return;
            setOptions([
              ...new Map(
                page.data.map((option) => [option.value, option]),
              ).values(),
            ]);
            setCursor(page.meta.nextCursor);
            setHasNext(page.meta.hasNext);
            setStatus("success");
          })
          .catch(() => {
            if (!abort.signal.aborted && version.current === requestVersion)
              setStatus("error");
          });
      },
      loadTitles ? 250 : 0,
    );
    return () => {
      clearTimeout(timer);
      clearTimeout(resetTimer);
      abort.abort();
    };
  }, [open, text, loadTitles, localTitles, retry]);
  const loadMore = async () => {
    if (!loadTitles || !cursor || loadingMore) return;
    if (seenCursors.current.has(cursor)) {
      setStatus("error");
      return;
    }
    const requestVersion = version.current;
    setLoadingMore(true);
    try {
      const page = await loadTitles({
        query: text,
        cursor,
        signal: controller.current?.signal,
      });
      if (
        version.current !== requestVersion ||
        controller.current?.signal.aborted
      )
        return;
      seenCursors.current.add(cursor);
      setOptions((current) => [
        ...new Map(
          [...current, ...page.data].map((option) => [option.value, option]),
        ).values(),
      ]);
      setCursor(page.meta.nextCursor);
      setHasNext(page.meta.hasNext);
      setStatus("success");
    } catch {
      if (
        version.current === requestVersion &&
        !controller.current?.signal.aborted
      )
        setStatus("error");
    } finally {
      if (
        version.current === requestVersion &&
        !controller.current?.signal.aborted
      )
        setLoadingMore(false);
    }
  };
  return (
    <View style={styles.field}>
      <Text style={styles.label}>Libellé</Text>
      <TextInput
        accessibilityLabel="Filtrer par libellé"
        autoCorrect={false}
        maxLength={50}
        placeholder="Suggestion ou texte libre"
        placeholderTextColor={colors.textMuted}
        style={styles.input}
        value={text}
        onFocus={() => setOpen(true)}
        onChangeText={(next) => {
          setText(next);
          onChange(next);
          setOpen(true);
        }}
        onBlur={() => {
          committedText.current = text.trim();
          onChange(text.trim());
        }}
        onSubmitEditing={() => {
          committedText.current = text.trim();
          onChange(text.trim());
          setOpen(false);
        }}
        onKeyPress={(event) => {
          if (event.nativeEvent.key === "Escape") {
            setText(committedText.current);
            onChange(committedText.current);
            setOpen(false);
          }
        }}
        returnKeyType="done"
      />
      {open && (
        <View style={styles.suggestions}>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              onChange(text.trim());
              setOpen(false);
            }}
            style={styles.control}
          >
            <Text style={styles.text}>
              {text.trim()
                ? `Utiliser « ${text.trim()} »`
                : "Tous les libellés"}
            </Text>
          </Pressable>
          {status === "loading" ? (
            <FeedbackState
              kind="loading"
              title="Recherche des libellés"
              description="Chargement des suggestions."
            />
          ) : null}
          {options.map((option) => (
            <Pressable
              key={option.value}
              accessibilityRole="button"
              accessibilityLabel={`Choisir le libellé ${option.label}`}
              onPress={() => {
                setText(option.value);
                committedText.current = option.value;
                onChange(option.value);
                setOpen(false);
              }}
              style={styles.control}
            >
              <Text style={styles.text}>{option.label}</Text>
            </Pressable>
          ))}
          {status === "success" && options.length === 0 ? (
            <Text style={styles.text}>
              Aucune suggestion. Vous pouvez utiliser le texte saisi.
            </Text>
          ) : null}
          {status === "error" ? (
            <FeedbackState
              kind="error"
              title="Suggestions indisponibles"
              description="Le texte libre reste utilisable."
              actions={[
                {
                  label: "Réessayer les suggestions",
                  onPress: () => {
                    if (options.length) void loadMore();
                    else setRetry((current) => current + 1);
                  },
                },
              ]}
            />
          ) : null}
          {hasNext && status !== "error" ? (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: loadingMore, busy: loadingMore }}
              disabled={loadingMore}
              onPress={() => void loadMore()}
              style={styles.control}
            >
              <Text style={styles.text}>
                {loadingMore
                  ? "Chargement des suggestions…"
                  : "Afficher plus de suggestions"}
              </Text>
            </Pressable>
          ) : null}
        </View>
      )}
    </View>
  );
};

export const ListQueryModal = ({
  initial,
  sortChoices,
  defaultSortLabel,
  categories,
  categoryLimit,
  typeChoices,
  periods,
  localTitles,
  loadTitles,
  onApply,
  onClose,
}: Props) => {
  const { colors, styles } = useQueryStyles();
  const [draft, setDraft] = useState(initial);
  const [errors, setErrors] = useState<string[]>([]);
  const [categorySearch, setCategorySearch] = useState("");
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const update = <K extends keyof QueryFormState>(
    key: K,
    value: QueryFormState[K],
  ) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setErrors([]);
  };
  const input = (
    label: string,
    key: "from" | "to" | "minAmount" | "maxAmount",
    placeholder: string,
  ) => (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        keyboardType={key.endsWith("Amount") ? "decimal-pad" : "default"}
        style={styles.input}
        value={draft[key]}
        onChangeText={(value) => update(key, value)}
        maxLength={key.endsWith("Amount") ? 12 : 10}
      />
    </View>
  );
  return (
    <Modal animationType="slide" visible onRequestClose={onClose}>
      <SafeAreaProvider>
        <SafeAreaView
          testID="list-query-panel"
          edges={["top", "bottom"]}
          style={styles.flex}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={styles.flex}
          >
            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.content}
            >
              <View style={styles.header}>
                <Text accessibilityRole="header" style={styles.heading}>
                  Trier et filtrer
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Fermer les filtres"
                  onPress={onClose}
                  style={styles.close}
                >
                  <Text style={styles.text}>Fermer</Text>
                </Pressable>
              </View>
              <Text style={styles.text}>
                Choisissez vos critères, puis appliquez-les à la liste.
              </Text>
              {errors.length > 0 ? (
                <FeedbackState
                  kind="error"
                  title="Filtres à corriger"
                  description={errors.join(" ")}
                />
              ) : null}
              <QueryChoiceField
                label="Trier par"
                choices={[
                  { value: "", label: defaultSortLabel },
                  ...sortChoices,
                ]}
                value={draft.sortField}
                onChange={(value) => update("sortField", value)}
              />
              <QueryChoiceField
                label="Ordre du tri"
                choices={[
                  { value: "asc", label: "Croissant" },
                  { value: "desc", label: "Décroissant" },
                ]}
                value={draft.order}
                onChange={(value) => update("order", value as SortOrder)}
                disabled={!draft.sortField}
              />
              <TitleFilter
                value={draft.title}
                onChange={(value) => update("title", value)}
                localTitles={localTitles}
                loadTitles={loadTitles}
              />
              <View style={styles.field}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ expanded: categoriesOpen }}
                  accessibilityLabel={`Catégories : ${draft.categoryIds.length ? `${draft.categoryIds.length} choisies` : "Toutes"}`}
                  style={styles.control}
                  onPress={() => setCategoriesOpen((current) => !current)}
                >
                  <Text style={styles.text}>
                    Catégories :{" "}
                    {draft.categoryIds.length
                      ? `${draft.categoryIds.length} choisies`
                      : "Toutes"}
                  </Text>
                  <Text accessible={false} style={styles.text}>
                    {categoriesOpen ? "−" : "+"}
                  </Text>
                </Pressable>
                {categoriesOpen && (
                  <View style={styles.field}>
                    <TextInput
                      accessibilityLabel="Rechercher une catégorie"
                      placeholder="Rechercher une catégorie"
                      placeholderTextColor={colors.textMuted}
                      style={styles.input}
                      value={categorySearch}
                      onChangeText={setCategorySearch}
                    />
                    {categories
                      .filter((option) =>
                        foldQueryText(option.label).includes(
                          foldQueryText(categorySearch),
                        ),
                      )
                      .map((option) => {
                        const checked = draft.categoryIds.includes(
                          option.value,
                        );
                        const disabled =
                          !checked &&
                          categoryLimit != null &&
                          draft.categoryIds.length >= categoryLimit;
                        return (
                          <Pressable
                            key={option.value}
                            accessibilityRole="checkbox"
                            accessibilityLabel={option.label}
                            accessibilityState={{ disabled }}
                            aria-checked={checked}
                            disabled={disabled}
                            style={[styles.control, checked && styles.selected]}
                            onPress={() =>
                              update(
                                "categoryIds",
                                checked
                                  ? draft.categoryIds.filter(
                                      (value) => value !== option.value,
                                    )
                                  : [...draft.categoryIds, option.value],
                              )
                            }
                          >
                            <Text style={styles.text}>{option.label}</Text>
                            <Text accessible={false} style={styles.text}>
                              {checked ? "✓" : "○"}
                            </Text>
                          </Pressable>
                        );
                      })}
                    {categoryLimit != null &&
                    draft.categoryIds.length >= categoryLimit ? (
                      <Text style={styles.text}>
                        {categoryLimit} catégories maximum.
                      </Text>
                    ) : null}
                  </View>
                )}
              </View>
              <QueryChoiceField
                label="Type d’opération"
                choices={[{ value: "", label: "Tous" }, ...typeChoices]}
                value={draft.kind}
                onChange={(value) => update("kind", value)}
              />
              {periods ? (
                <QueryChoiceField
                  label="Périodicité"
                  choices={[{ value: "", label: "Toutes" }, ...periods]}
                  value={draft.period}
                  onChange={(value) => update("period", value)}
                />
              ) : (
                <>
                  {input("Date du (AAAA-MM-JJ)", "from", "2026-11-01")}
                  {input("Date au (AAAA-MM-JJ)", "to", "2026-11-30")}
                  {input("Montant minimum", "minAmount", "0,00")}
                  {input("Montant maximum", "maxAmount", "Sans maximum")}
                </>
              )}
              <Pressable
                accessibilityRole="button"
                style={styles.primary}
                onPress={() =>
                  setErrors(onApply({ ...draft, title: draft.title.trim() }))
                }
              >
                <Text style={styles.primaryText}>
                  Appliquer le tri et les filtres
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                style={styles.control}
                onPress={onClose}
              >
                <Text style={styles.text}>Annuler</Text>
              </Pressable>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </SafeAreaProvider>
    </Modal>
  );
};
const makeStyles = (
  colors: typeof themes.light.color | typeof themes.dark.color,
) =>
  StyleSheet.create({
    flex: { flex: 1, backgroundColor: colors.backgroundCanvas },
    content: {
      padding: primitives.space["5"],
      gap: primitives.space["3"],
      maxWidth: primitives.size.contentSm,
      alignSelf: "center",
      width: "100%",
      paddingBottom: primitives.space["12"],
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      gap: primitives.space["2"],
    },
    heading: {
      color: colors.textPrimary,
      fontSize: primitives.fontSize["2xl"],
      fontWeight: "600",
      flex: 1,
    },
    text: {
      color: colors.textPrimary,
      fontSize: primitives.fontSize.md,
      flexShrink: 1,
    },
    label: {
      color: colors.textPrimary,
      fontSize: primitives.fontSize.md,
      fontWeight: "600",
    },
    field: { gap: primitives.space["2"] },
    control: {
      minHeight: semantic.size.controlMinHeight,
      minWidth: semantic.size.controlMinHeight,
      borderRadius: semantic.radius.control,
      borderWidth: semantic.borderWidth.default,
      borderColor: colors.fieldBorder,
      backgroundColor: colors.fieldBackground,
      padding: primitives.space["3"],
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: primitives.space["2"],
    },
    selected: {
      backgroundColor: colors.actionSecondaryBackground,
      borderColor: colors.borderStrong,
    },
    input: {
      minHeight: semantic.size.controlMinHeight,
      borderRadius: semantic.radius.control,
      borderWidth: semantic.borderWidth.default,
      borderColor: colors.fieldBorder,
      backgroundColor: colors.fieldBackground,
      padding: primitives.space["3"],
      color: colors.textPrimary,
      fontSize: primitives.fontSize.md,
    },
    suggestions: { gap: primitives.space["2"] },
    close: {
      minHeight: semantic.size.controlMinHeight,
      minWidth: semantic.size.controlMinHeight,
      justifyContent: "center",
      padding: primitives.space["2"],
    },
    primary: {
      minHeight: semantic.size.controlMinHeight,
      borderRadius: semantic.radius.control,
      backgroundColor: colors.actionPrimaryBackground,
      alignItems: "center",
      justifyContent: "center",
      padding: primitives.space["3"],
    },
    primaryText: {
      color: colors.actionPrimaryText,
      fontSize: primitives.fontSize.md,
      fontWeight: "600",
    },
  });
