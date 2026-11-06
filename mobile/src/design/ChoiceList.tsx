import { ReactNode } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from "react-native";
import { primitives, semantic, themes } from "@/src/design/tokens";

export interface Choice<T extends string | number> {
  value: T;
  label: string;
}
interface Props<T extends string | number> {
  choices: Choice<T>[];
  value: T | null;
  label: string;
  disabled?: boolean;
  error?: string;
  renderLeading?(choice: Choice<T>): ReactNode;
  onChange(value: T): void;
}
/** Shared radio list. Domain adapters provide labels/icons; selection never saves. */
export const ChoiceList = <T extends string | number>({
  choices,
  value,
  label,
  disabled = false,
  error,
  renderLeading,
  onChange,
}: Props<T>) => {
  const colors = themes[useColorScheme() === "dark" ? "dark" : "light"].color;
  return (
    <View>
      <View
        accessibilityRole="radiogroup"
        accessibilityLabel={label}
        style={styles.list}
      >
        {choices.map((choice) => {
          const selected = choice.value === value;
          return (
            <Pressable
              key={choice.value}
              accessibilityRole="radio"
              accessibilityLabel={choice.label}
              accessibilityState={{ disabled }}
              aria-checked={selected}
              disabled={disabled}
              onPress={() => {
                if (!selected) onChange(choice.value);
              }}
              style={[
                styles.choice,
                {
                  borderColor: error
                    ? colors.statusErrorText
                    : selected
                      ? colors.borderStrong
                      : colors.fieldBorder,
                  backgroundColor: selected
                    ? colors.actionSecondaryBackground
                    : colors.fieldBackground,
                  opacity: disabled ? 0.6 : 1,
                },
              ]}
            >
              {renderLeading && (
                <View style={styles.leading}>{renderLeading(choice)}</View>
              )}
              <Text
                style={[
                  styles.label,
                  {
                    color: selected
                      ? colors.actionSecondaryText
                      : colors.textPrimary,
                  },
                ]}
              >
                {choice.label}
              </Text>
              <Text
                accessible={false}
                aria-hidden
                style={{ color: colors.textPrimary }}
              >
                {selected ? "✓" : ""}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {error ? (
        <Text
          accessibilityRole="alert"
          accessibilityLiveRegion="assertive"
          style={{ color: colors.statusErrorText }}
        >
          {error}
        </Text>
      ) : null}
    </View>
  );
};
const styles = StyleSheet.create({
  list: { gap: primitives.space["2"] },
  choice: {
    minHeight: 48,
    borderWidth: semantic.borderWidth.default,
    borderRadius: semantic.radius.control,
    padding: primitives.space["3"],
    flexDirection: "row",
    alignItems: "center",
    gap: primitives.space["2"],
  },
  label: { flex: 1, flexShrink: 1, fontSize: primitives.fontSize.md },
  leading: { width: 24, alignItems: "center", flexShrink: 0 },
});
