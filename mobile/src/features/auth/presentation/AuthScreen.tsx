import Ionicons from "@expo/vector-icons/Ionicons";
import { PropsWithChildren, ReactNode, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { primitives, semantic, themes } from "@/src/design/tokens";
import { FeedbackBanner, FeedbackState } from "@/src/design/FeedbackState";

const colors = themes.light.color;
const semibold = primitives.fontWeight.semibold.toString() as "600";
const bold = primitives.fontWeight.bold.toString() as "700";

interface AuthScreenProps extends PropsWithChildren {
  title: string;
  subtitle: string;
  backLabel?: string;
  onBack?: () => void;
}

export const AuthScreen = ({
  backLabel = "Retour",
  children,
  onBack,
  subtitle,
  title,
}: AuthScreenProps) => (
  <SafeAreaView style={styles.safeArea}>
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.keyboardView}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.card}>
          {onBack ? (
            <Pressable
              accessibilityLabel={backLabel}
              accessibilityRole="button"
              onPress={onBack}
              style={({ pressed }) => [
                styles.backButton,
                pressed && styles.pressed,
              ]}
            >
              <Ionicons
                color={colors.textSecondary}
                name="arrow-back"
                size={20}
              />
              <Text style={styles.backLabel}>{backLabel}</Text>
            </Pressable>
          ) : null}

          <View style={styles.brand}>
            <View style={styles.brandIcon}>
              <Ionicons
                color={colors.actionPrimaryText}
                name="wallet"
                size={28}
              />
            </View>
            <Text style={styles.brandName}>My Happy Wallet</Text>
          </View>

          <View style={styles.heading}>
            <Text accessibilityRole="header" style={styles.title}>
              {title}
            </Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
          </View>

          {children}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>
);

interface AuthFieldProps extends TextInputProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
}

export const AuthField = ({
  icon,
  label,
  secureTextEntry = false,
  ...inputProps
}: AuthFieldProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const isPassword = secureTextEntry;

  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.field}>
        <Ionicons color={colors.textMuted} name={icon} size={20} />
        <TextInput
          {...inputProps}
          accessibilityLabel={label}
          placeholderTextColor={colors.textMuted}
          secureTextEntry={isPassword && !isVisible}
          style={styles.input}
        />
        {isPassword ? (
          <Pressable
            accessibilityLabel={
              isVisible ? "Masquer le mot de passe" : "Afficher le mot de passe"
            }
            accessibilityRole="button"
            onPress={() => setIsVisible((visible) => !visible)}
            style={styles.visibilityButton}
          >
            <Ionicons
              color={colors.textMuted}
              name={isVisible ? "eye-off-outline" : "eye-outline"}
              size={22}
            />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
};

interface AuthActionButtonProps {
  isLoading?: boolean;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
}

export const AuthActionButton = ({
  icon,
  isLoading = false,
  label,
  onPress,
}: AuthActionButtonProps) => (
  <Pressable
    accessibilityRole="button"
    disabled={isLoading}
    onPress={onPress}
    style={({ pressed }) => [
      styles.actionButton,
      pressed && styles.pressed,
      isLoading && styles.disabled,
    ]}
  >
    {isLoading ? (
      <ActivityIndicator color={colors.actionPrimaryText} />
    ) : (
      <>
        <Ionicons color={colors.actionPrimaryText} name={icon} size={20} />
        <Text style={styles.actionLabel}>{label}</Text>
      </>
    )}
  </Pressable>
);

interface AuthMessageProps {
  children: ReactNode;
  kind: "error" | "success";
}

export const AuthMessage = ({ children, kind }: AuthMessageProps) => (
  <View style={styles.message}>
    <FeedbackBanner kind={kind}>{children}</FeedbackBanner>
  </View>
);

interface AuthLinkRowProps {
  label: string;
  linkLabel: string;
  onPress: () => void;
}

export const AuthLinkRow = ({
  label,
  linkLabel,
  onPress,
}: AuthLinkRowProps) => (
  <View style={styles.linkRow}>
    <Text style={styles.linkContext}>{label}</Text>
    <Pressable accessibilityRole="link" onPress={onPress}>
      <Text style={styles.linkLabel}>{linkLabel}</Text>
    </Pressable>
  </View>
);

interface AuthSuccessProps {
  message: string;
  title: string;
}

export const AuthSuccess = ({ message, title }: AuthSuccessProps) => (
  <View style={styles.successCard}>
    <FeedbackState
      description={message}
      icon="mail-open"
      kind="success"
      title={title}
    />
  </View>
);

const styles = StyleSheet.create({
  safeArea: { backgroundColor: colors.backgroundCanvas, flex: 1 },
  keyboardView: { flex: 1 },
  content: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: primitives.space["4"],
    paddingVertical: primitives.space["8"],
  },
  card: {
    alignSelf: "center",
    backgroundColor: colors.backgroundSurface,
    borderColor: colors.borderSubtle,
    borderRadius: semantic.radius.card,
    borderWidth: semantic.borderWidth.default,
    maxWidth: primitives.size.contentSm,
    padding: primitives.space["6"],
    width: "100%",
  },
  backButton: {
    alignItems: "center",
    alignSelf: "flex-start",
    flexDirection: "row",
    gap: primitives.space["2"],
    minHeight: semantic.size.controlMinHeight,
  },
  backLabel: {
    color: colors.textSecondary,
    fontSize: primitives.fontSize.sm,
    fontWeight: semibold,
    textDecorationLine: "underline",
  },
  brand: {
    alignItems: "center",
    alignSelf: "center",
    flexDirection: "row",
    gap: primitives.space["3"],
  },
  brandIcon: {
    alignItems: "center",
    backgroundColor: colors.actionPrimaryBackground,
    borderRadius: semantic.radius.control,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  brandName: {
    color: colors.textPrimary,
    fontSize: primitives.fontSize.lg,
    fontWeight: bold,
  },
  heading: { marginTop: primitives.space["8"] },
  title: {
    color: colors.textPrimary,
    fontSize: primitives.fontSize["2xl"],
    fontWeight: bold,
    lineHeight: 40,
    textAlign: "center",
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: primitives.fontSize.md,
    lineHeight: 24,
    marginTop: primitives.space["2"],
    textAlign: "center",
  },
  fieldGroup: { marginTop: primitives.space["5"] },
  label: {
    color: colors.textPrimary,
    fontSize: primitives.fontSize.sm,
    fontWeight: bold,
    marginBottom: primitives.space["2"],
  },
  field: {
    alignItems: "center",
    backgroundColor: colors.fieldBackground,
    borderColor: colors.fieldBorder,
    borderRadius: semantic.radius.control,
    borderWidth: semantic.borderWidth.default,
    flexDirection: "row",
    minHeight: semantic.size.controlMinHeight,
    paddingLeft: semantic.space.controlInline,
  },
  input: {
    color: colors.fieldText,
    flex: 1,
    fontSize: primitives.fontSize.md,
    minHeight: semantic.size.controlMinHeight,
    paddingHorizontal: primitives.space["3"],
    paddingVertical: primitives.space["2"],
  },
  visibilityButton: {
    alignItems: "center",
    height: semantic.size.controlMinHeight,
    justifyContent: "center",
    width: semantic.size.controlMinHeight,
  },
  actionButton: {
    alignItems: "center",
    backgroundColor: colors.actionPrimaryBackground,
    borderRadius: semantic.radius.control,
    flexDirection: "row",
    gap: primitives.space["2"],
    justifyContent: "center",
    marginTop: primitives.space["6"],
    minHeight: semantic.size.controlMinHeight,
    paddingHorizontal: semantic.space.controlInline,
  },
  actionLabel: {
    color: colors.actionPrimaryText,
    fontSize: primitives.fontSize.md,
    fontWeight: semibold,
  },
  pressed: { opacity: 0.8 },
  disabled: { opacity: 0.55 },
  message: {
    marginTop: primitives.space["4"],
  },
  linkRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: primitives.space["1"],
    justifyContent: "center",
    marginTop: primitives.space["4"],
  },
  linkContext: { color: colors.textMuted, fontSize: primitives.fontSize.sm },
  linkLabel: {
    color: colors.textPrimary,
    fontSize: primitives.fontSize.sm,
    fontWeight: bold,
    textDecorationLine: "underline",
  },
  successCard: {
    marginTop: primitives.space["8"],
  },
});
