import Ionicons from "@expo/vector-icons/Ionicons";
import { ReactNode } from "react";
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";

import { AppIconName } from "@/src/navigation/appDestinations";
import { primitives, semantic, themes } from "@/src/design/tokens";

type DestinationScreenProps = {
  title: string;
  description: string;
  icon: AppIconName;
  children?: ReactNode;
};

const colors = themes.light.color;
const boldFontWeight = `${primitives.fontWeight.bold}` as "700";

export const DestinationScreen = ({
  children,
  description,
  icon,
  title,
}: DestinationScreenProps) => (
  <SafeAreaView style={styles.safeArea}>
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.iconContainer}>
        <Ionicons color={colors.navigationText} name={icon} size={24} />
      </View>
      <Text accessibilityRole="header" style={styles.title}>
        {title}
      </Text>
      <Text style={styles.description}>{description}</Text>
      {children}
    </ScrollView>
  </SafeAreaView>
);

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: colors.backgroundCanvas,
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: primitives.space["6"],
    paddingVertical: semantic.space.section,
  },
  iconContainer: {
    alignItems: "center",
    backgroundColor: colors.navigationBackground,
    borderRadius: semantic.radius.card,
    height: primitives.size.controlMd,
    justifyContent: "center",
    width: primitives.size.controlMd,
  },
  title: {
    color: colors.textPrimary,
    fontSize: primitives.fontSize["2xl"],
    fontWeight: boldFontWeight,
    lineHeight: primitives.fontSize["2xl"] * primitives.lineHeight.heading,
    marginTop: primitives.space["6"],
  },
  description: {
    color: colors.textMuted,
    fontSize: primitives.fontSize.md,
    lineHeight: primitives.fontSize.md * primitives.lineHeight.body,
    marginTop: primitives.space["3"],
    maxWidth: primitives.size.contentSm,
  },
});
