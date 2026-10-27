import Ionicons from "@expo/vector-icons/Ionicons";
import { ReactNode, useMemo } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  FeedbackKind,
  getFeedbackAccessibility,
} from "@/src/design/feedbackAccessibility";
import { primitives, semantic, themes } from "@/src/design/tokens";

type Theme = keyof typeof themes;
// Legacy consumers still paint light surfaces. The parent opts into its theme
// when using an unframed state, whose background belongs to that parent.
const useStyles = (theme: Theme = "light") => {
  const colors = themes[theme].color;
  return { colors, styles: useMemo(() => makeStyles(colors), [colors]) };
};
const semibold = `${primitives.fontWeight.semibold}` as "600";

type BannerKind = "success" | "error";

interface FeedbackAction {
  /** Nom accessible quand plusieurs actions identiques coexistent à l'écran. */
  accessibilityLabel?: string;
  label: string;
  onPress(): void;
  variant?: "primary" | "secondary";
}

interface FeedbackStateProps {
  theme?: Theme;
  actions?: FeedbackAction[];
  description: string;
  /** `false` dans une carte qui a déjà son cadre, comme un graphique (#154). */
  framed?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  kind: FeedbackKind;
  title: string;
}

const defaultIcons: Record<
  Exclude<FeedbackKind, "loading">,
  keyof typeof Ionicons.glyphMap
> = {
  empty: "file-tray-outline",
  error: "cloud-offline-outline",
  success: "checkmark-circle-outline",
};

export const FeedbackState = ({
  actions = [],
  description,
  framed = true,
  icon,
  kind,
  title,
  theme,
}: FeedbackStateProps) => {
  const { colors, styles } = useStyles(theme);
  const isError = kind === "error";
  const isSuccess = kind === "success";
  const accessibility = getFeedbackAccessibility(kind);

  return (
    <View style={[styles.state, !framed && styles.unframed]}>
      <View
        accessible
        accessibilityLabel={`${title}. ${description}`}
        accessibilityLiveRegion={accessibility.liveRegion}
        accessibilityRole={accessibility.role}
        style={styles.announcement}
      >
        {kind === "loading" ? (
          <ActivityIndicator color={colors.statusInfoText} size="large" />
        ) : (
          <View
            style={[
              styles.icon,
              isError && styles.errorIcon,
              isSuccess && styles.successIcon,
            ]}
          >
            <Ionicons
              color={
                isError
                  ? colors.statusErrorText
                  : isSuccess
                    ? colors.statusSuccessText
                    : colors.textSecondary
              }
              name={icon ?? defaultIcons[kind]}
              size={32}
            />
          </View>
        )}
        <Text accessibilityRole="header" style={styles.title}>
          {title}
        </Text>
        <Text style={styles.description}>{description}</Text>
      </View>
      {actions.length > 0 ? (
        <View style={styles.actions}>
          {actions.map(
            ({ accessibilityLabel, label, onPress, variant = "primary" }) => (
              <Pressable
                accessibilityLabel={accessibilityLabel}
                accessibilityRole="button"
                key={label}
                onPress={onPress}
                style={({ pressed }) => [
                  styles.action,
                  variant === "secondary"
                    ? styles.secondaryAction
                    : styles.primaryAction,
                  pressed && styles.pressed,
                ]}
              >
                <Text
                  style={
                    variant === "secondary"
                      ? styles.secondaryActionLabel
                      : styles.primaryActionLabel
                  }
                >
                  {label}
                </Text>
              </Pressable>
            ),
          )}
        </View>
      ) : null}
    </View>
  );
};

interface FeedbackBannerProps {
  theme?: Theme;
  children: ReactNode;
  kind: BannerKind;
}

export const FeedbackBanner = ({
  children,
  kind,
  theme,
}: FeedbackBannerProps) => {
  const { colors, styles } = useStyles(theme);
  return (
    <View
      accessibilityLiveRegion={kind === "error" ? "assertive" : "polite"}
      accessibilityRole={kind === "error" ? "alert" : "summary"}
      style={[
        styles.banner,
        kind === "error" ? styles.errorBanner : styles.successBanner,
      ]}
    >
      <Ionicons
        color={
          kind === "error" ? colors.statusErrorText : colors.statusSuccessText
        }
        name={
          kind === "error" ? "alert-circle-outline" : "checkmark-circle-outline"
        }
        size={20}
      />
      <Text
        style={
          kind === "error" ? styles.errorBannerText : styles.successBannerText
        }
      >
        {children}
      </Text>
    </View>
  );
};

const makeStyles = (
  colors: typeof themes.light.color | typeof themes.dark.color,
) =>
  StyleSheet.create({
    state: {
      alignItems: "center",
      alignSelf: "center",
      backgroundColor: colors.backgroundSurface,
      borderColor: colors.borderSubtle,
      borderRadius: semantic.radius.card,
      borderWidth: semantic.borderWidth.default,
      maxWidth: primitives.size.contentSm,
      padding: semantic.space.card,
      width: "100%",
    },
    unframed: {
      backgroundColor: "transparent",
      borderWidth: 0,
      padding: 0,
    },
    announcement: {
      alignItems: "center",
      gap: primitives.space["3"],
    },
    icon: {
      alignItems: "center",
      backgroundColor: colors.actionSecondaryBackground,
      borderRadius: primitives.radius.pill,
      height: 56,
      justifyContent: "center",
      width: 56,
    },
    errorIcon: { backgroundColor: colors.statusErrorSurface },
    successIcon: { backgroundColor: colors.statusSuccessSurface },
    title: {
      color: colors.textPrimary,
      fontSize: primitives.fontSize.lg,
      fontWeight: semibold,
      textAlign: "center",
    },
    description: {
      color: colors.textSecondary,
      fontSize: primitives.fontSize.md,
      lineHeight: 24,
      textAlign: "center",
    },
    actions: {
      alignItems: "center",
      flexDirection: "row",
      flexWrap: "wrap",
      gap: primitives.space["2"],
      justifyContent: "center",
      marginTop: primitives.space["2"],
    },
    action: {
      borderRadius: semantic.radius.control,
      justifyContent: "center",
      minHeight: semantic.size.controlMinHeight,
      paddingHorizontal: semantic.space.controlInline,
    },
    primaryAction: { backgroundColor: colors.actionPrimaryBackground },
    secondaryAction: { backgroundColor: colors.actionSecondaryBackground },
    primaryActionLabel: {
      color: colors.actionPrimaryText,
      fontSize: primitives.fontSize.md,
      fontWeight: semibold,
    },
    secondaryActionLabel: {
      color: colors.actionSecondaryText,
      fontSize: primitives.fontSize.md,
      fontWeight: semibold,
    },
    pressed: { opacity: 0.78 },
    banner: {
      alignItems: "center",
      borderRadius: semantic.radius.control,
      flexDirection: "row",
      gap: primitives.space["2"],
      marginBottom: primitives.space["4"],
      padding: primitives.space["3"],
    },
    successBanner: { backgroundColor: colors.statusSuccessSurface },
    errorBanner: { backgroundColor: colors.statusErrorSurface },
    successBannerText: {
      color: colors.statusSuccessText,
      flex: 1,
      fontSize: primitives.fontSize.sm,
    },
    errorBannerText: {
      color: colors.statusErrorText,
      flex: 1,
      fontSize: primitives.fontSize.sm,
    },
  });
