import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import { StyleSheet, useColorScheme, View } from "react-native";

import { primitives, semantic, themes } from "@/src/design/tokens";
import { fontAwesomeIcon } from "@/src/features/categories/domain/categoryIcons";

interface CategoryMarkProps {
  category: { color: string | null; icon?: string | null } | undefined;
  size?: number;
}

/**
 * Icône de la catégorie dans sa couleur, ou pastille de couleur sans icône
 * (ou pour une icône retirée de la liste). Décorative : le nom affiché à côté
 * porte le sens pour les lecteurs d'écran.
 */
export const CategoryMark = ({ category, size = 20 }: CategoryMarkProps) => {
  const colors = themes[useColorScheme() === "dark" ? "dark" : "light"].color;
  const icon = fontAwesomeIcon(category?.icon);
  if (icon) {
    return (
      <View
        testID="category-mark-icon"
        accessibilityElementsHidden
        aria-hidden
        importantForAccessibility="no-hide-descendants"
        style={[styles.iconBox, { height: size, width: size }]}
      >
        <FontAwesome6
          color={category?.color ?? colors.textSecondary}
          name={icon.name}
          size={size * 0.9}
          solid={icon.solid}
        />
      </View>
    );
  }
  return (
    <View
      testID="category-mark-fallback"
      accessibilityElementsHidden
      aria-hidden
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.swatch,
        {
          borderColor: colors.borderStrong,
          backgroundColor: colors.backgroundCanvas,
        },
        { height: size, width: size },
        category?.color ? { backgroundColor: category.color } : undefined,
      ]}
    />
  );
};

const styles = StyleSheet.create({
  iconBox: { alignItems: "center", justifyContent: "center" },
  swatch: {
    borderRadius: primitives.radius.pill,
    borderWidth: semantic.borderWidth.default,
  },
});
