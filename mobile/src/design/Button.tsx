import Ionicons from "@expo/vector-icons/Ionicons";
import { forwardRef } from "react";
import {
  ActivityIndicator,
  Pressable,
  PressableProps,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from "react-native";
import { primitives, semantic, themes } from "@/src/design/tokens";
interface Props extends Omit<PressableProps, "children" | "style"> {
  label: string;
  variant?: "primary" | "secondary" | "danger";
  icon?: keyof typeof Ionicons.glyphMap;
  busy?: boolean;
  style?: PressableProps["style"];
}
/** Generic themed button: no domain command or confirmation logic. */
export const Button = forwardRef<View, Props>(function Button(
  {
    label,
    variant = "secondary",
    icon,
    busy = false,
    disabled = false,
    style,
    accessibilityState,
    ...props
  },
  ref,
) {
  const colors = themes[useColorScheme() === "dark" ? "dark" : "light"].color;
  const foreground =
    variant === "danger"
      ? colors.statusErrorText
      : variant === "primary"
        ? colors.actionPrimaryText
        : colors.actionSecondaryText;
  const background =
    variant === "danger"
      ? colors.statusErrorSurface
      : variant === "primary"
        ? colors.actionPrimaryBackground
        : colors.actionSecondaryBackground;
  return (
    <Pressable
      {...props}
      ref={ref}
      accessibilityRole="button"
      accessibilityLabel={props.accessibilityLabel ?? label}
      accessibilityState={{
        ...accessibilityState,
        disabled: disabled || busy,
        busy,
      }}
      disabled={disabled || busy}
      style={(state) => [
        typeof style === "function" ? style(state) : style,
        styles.button,
        {
          backgroundColor: background,
          borderColor: variant === "danger" ? foreground : colors.borderStrong,
          opacity: disabled || busy ? 0.6 : state.pressed ? 0.85 : 1,
        },
      ]}
    >
      {busy ? (
        <ActivityIndicator color={foreground} />
      ) : icon ? (
        <Ionicons
          accessible={false}
          aria-hidden
          testID="action-button-icon"
          name={icon}
          size={20}
          color={foreground}
        />
      ) : null}
      <Text style={[styles.label, { color: foreground }]}>{label}</Text>
    </Pressable>
  );
});
const styles = StyleSheet.create({
  button: {
    width: "auto",
    height: "auto",
    maxWidth: "100%",
    minHeight: 48,
    minWidth: 48,
    borderWidth: semantic.borderWidth.default,
    borderRadius: semantic.radius.control,
    padding: primitives.space["3"],
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: primitives.space["2"],
    flexShrink: 1,
  },
  label: {
    fontSize: primitives.fontSize.md,
    fontWeight: "600",
    flexShrink: 1,
    textAlign: "center",
  },
});
