import { Pressable, StyleSheet, Text, View } from "react-native";

import { primitives, semantic, themes } from "@/src/design/tokens";

export interface RadioChoice<T extends string> {
  value: T;
  label: string;
}

interface RadioGroupProps<T extends string> {
  choices: RadioChoice<T>[];
  disabled: boolean;
  label: string;
  value: T;
  onChange(value: T): void;
}

const colors = themes.light.color;
const semibold = `${primitives.fontWeight.semibold}` as "600";

/**
 * Groupe de radios segmenté et accessible : nom du groupe, état coché par
 * `aria-checked` (exposé aussi sur l'export Web, #148), cibles de 48 dp.
 * Un appui sur le choix déjà coché ne déclenche rien.
 */
export const RadioGroup = <T extends string>({
  choices,
  disabled,
  label,
  value,
  onChange,
}: RadioGroupProps<T>) => (
  <View
    accessibilityLabel={label}
    accessibilityRole="radiogroup"
    style={styles.segmented}
  >
    {choices.map((choice) => {
      const selected = choice.value === value;
      return (
        <Pressable
          key={choice.value}
          accessibilityRole="radio"
          accessibilityState={{ disabled }}
          aria-checked={selected}
          disabled={disabled}
          onPress={() => {
            if (!selected) onChange(choice.value);
          }}
          style={[styles.segment, selected && styles.segmentSelected]}
        >
          <Text
            style={[
              styles.segmentLabel,
              selected && styles.segmentLabelSelected,
            ]}
          >
            {choice.label}
          </Text>
        </Pressable>
      );
    })}
  </View>
);

const styles = StyleSheet.create({
  segmented: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: primitives.space["2"],
  },
  segment: {
    alignItems: "center",
    borderColor: colors.fieldBorder,
    borderRadius: semantic.radius.control,
    borderWidth: semantic.borderWidth.default,
    flexGrow: 1,
    justifyContent: "center",
    minHeight: semantic.size.controlMinHeight,
    paddingHorizontal: primitives.space["3"],
  },
  segmentSelected: {
    backgroundColor: colors.actionSecondaryBackground,
    borderColor: colors.borderStrong,
  },
  segmentLabel: {
    color: colors.textSecondary,
    fontSize: primitives.fontSize.md,
    fontWeight: semibold,
  },
  segmentLabelSelected: { color: colors.actionSecondaryText },
});
