import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { primitives, semantic, themes } from "@/src/design/tokens";
import { fontAwesomeIcon } from "@/src/features/categories/domain/categoryIcons";
import { CategoryMark } from "@/src/features/categories/presentation/CategoryMark";
import { getCategoryIconPickerState } from "./categoryIconPickerState";

const colors = themes.light.color;
const semibold = `${primitives.fontWeight.semibold}` as "600";

interface CategoryIconPickerProps {
  color: string | null;
  disabled: boolean;
  name: string;
  value: string | null;
  onChange(icon: string | null): void;
}

/**
 * Choix de l'icône Font Awesome d'une catégorie : recherche (mots-clés
 * français ou nom Font Awesome), aperçu dans la couleur choisie, « Sans
 * icône » pour revenir à la pastille. Options radio de 48 px.
 */
export const CategoryIconPicker = ({
  color,
  disabled,
  name,
  value,
  onChange,
}: CategoryIconPickerProps) => {
  const [query, setQuery] = useState("");
  const { options, status, previewLabel } = useMemo(
    () => getCategoryIconPickerState(query, value),
    [query, value],
  );
  const displayName = name.trim() || "Nouvelle catégorie";

  return (
    <View style={styles.picker}>
      <Text style={styles.label}>Icône</Text>
      <View
        accessibilityLabel={`Aperçu : ${displayName}, ${previewLabel}`}
        accessible
        style={styles.preview}
      >
        <CategoryMark category={{ color, icon: value }} size={28} />
        <Text style={styles.previewName}>{displayName}</Text>
      </View>
      <TextInput
        accessibilityHint="En français (courses, santé…) ou par nom Font Awesome."
        accessibilityLabel="Rechercher une icône"
        autoCapitalize="none"
        autoCorrect={false}
        editable={!disabled}
        onChangeText={setQuery}
        placeholder="Rechercher : courses, santé…"
        style={styles.input}
        value={query}
      />
      <Text accessibilityLiveRegion="polite" style={styles.status}>
        {status}
      </Text>
      <View
        accessibilityLabel="Icône"
        accessibilityRole="radiogroup"
        style={styles.grid}
      >
        <Pressable
          accessibilityLabel="Sans icône"
          accessibilityRole="radio"
          aria-checked={!value}
          aria-disabled={disabled}
          disabled={disabled}
          onPress={() => onChange(null)}
          style={[styles.noneOption, !value && styles.optionChecked]}
        >
          <Text style={[styles.noneLabel, !value && styles.labelChecked]}>
            Sans icône
          </Text>
        </Pressable>
        {options.map(({ icon, label }) => {
          const glyph = fontAwesomeIcon(icon);
          const checked = value === icon;
          return (
            <Pressable
              key={icon}
              accessibilityLabel={label}
              accessibilityRole="radio"
              aria-checked={checked}
              aria-disabled={disabled}
              disabled={disabled}
              onPress={() => onChange(icon)}
              style={[styles.option, checked && styles.optionChecked]}
            >
              {glyph ? (
                <FontAwesome6
                  color={checked ? colors.statusInfoText : colors.textPrimary}
                  name={glyph.name}
                  size={22}
                  solid={glyph.solid}
                />
              ) : (
                <CategoryMark category={{ color, icon: null }} />
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  picker: { gap: primitives.space["2"] },
  label: {
    color: colors.textPrimary,
    fontSize: primitives.fontSize.sm,
    fontWeight: semibold,
    marginTop: primitives.space["4"],
  },
  preview: {
    alignItems: "center",
    backgroundColor: colors.backgroundSurface,
    borderColor: colors.borderSubtle,
    borderRadius: semantic.radius.control,
    borderWidth: semantic.borderWidth.default,
    flexDirection: "row",
    gap: primitives.space["3"],
    minHeight: semantic.size.controlMinHeight,
    paddingHorizontal: primitives.space["4"],
  },
  previewName: {
    color: colors.textPrimary,
    flex: 1,
    fontSize: primitives.fontSize.md,
    fontWeight: semibold,
  },
  input: {
    backgroundColor: colors.fieldBackground,
    borderColor: colors.fieldBorder,
    borderRadius: semantic.radius.control,
    borderWidth: semantic.borderWidth.default,
    color: colors.fieldText,
    fontSize: primitives.fontSize.md,
    minHeight: semantic.size.controlMinHeight,
    paddingHorizontal: semantic.space.controlInline,
  },
  status: { color: colors.textMuted, fontSize: primitives.fontSize.sm },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: primitives.space["2"],
  },
  option: {
    alignItems: "center",
    borderColor: colors.borderSubtle,
    borderRadius: semantic.radius.control,
    borderWidth: semantic.borderWidth.default,
    height: primitives.size.controlMd,
    justifyContent: "center",
    width: primitives.size.controlMd,
  },
  noneOption: {
    alignItems: "center",
    borderColor: colors.borderSubtle,
    borderRadius: semantic.radius.control,
    borderWidth: semantic.borderWidth.default,
    justifyContent: "center",
    minHeight: primitives.size.controlMd,
    paddingHorizontal: primitives.space["3"],
  },
  optionChecked: {
    backgroundColor: colors.statusInfoSurface,
    borderColor: colors.statusInfoText,
  },
  noneLabel: { color: colors.textPrimary, fontSize: primitives.fontSize.md },
  labelChecked: { color: colors.statusInfoText, fontWeight: semibold },
});
