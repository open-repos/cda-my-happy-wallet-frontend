import Ionicons from "@expo/vector-icons/Ionicons";
import { Tabs } from "expo-router";
import { Platform, useWindowDimensions, type ColorValue } from "react-native";

import {
  APP_DESTINATIONS,
  AppDestination,
} from "@/src/navigation/appDestinations";
import { primitives, semantic, themes } from "@/src/design/tokens";

const colors = themes.light.color;
const desktopNavigationBreakpoint = 1024;
const semiboldFontWeight = `${primitives.fontWeight.semibold}` as "600";

const createTabOptions = (destination: AppDestination) => ({
  title: destination.label,
  tabBarAccessibilityLabel: destination.accessibilityLabel,
  tabBarIcon: ({ color, focused, size }: TabIconProps) => (
    <Ionicons
      color={color}
      name={focused ? destination.activeIcon : destination.icon}
      size={Math.min(size, primitives.size.controlSm - primitives.space["4"])}
    />
  ),
});

type TabIconProps = {
  color: ColorValue;
  focused: boolean;
  size: number;
};

export default function AppLayout() {
  const { width } = useWindowDimensions();
  const usesDesktopNavigation =
    Platform.OS === "web" && width >= desktopNavigationBreakpoint;

  return (
    <Tabs
      backBehavior="history"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.navigationActive,
        tabBarInactiveTintColor: colors.navigationText,
        tabBarHideOnKeyboard: true,
        tabBarItemStyle: usesDesktopNavigation
          ? styles.desktopTabItem
          : styles.tabItem,
        tabBarLabelPosition: usesDesktopNavigation ? "below-icon" : undefined,
        tabBarLabelStyle: styles.tabLabel,
        tabBarPosition: usesDesktopNavigation ? "left" : "bottom",
        tabBarShowLabel: !usesDesktopNavigation,
        tabBarStyle: usesDesktopNavigation
          ? styles.desktopTabBar
          : styles.tabBar,
        tabBarVariant: usesDesktopNavigation ? "material" : "uikit",
      }}
    >
      {APP_DESTINATIONS.map((destination) => (
        <Tabs.Screen
          key={destination.route}
          name={destination.route}
          options={createTabOptions(destination)}
        />
      ))}
      <Tabs.Screen name="fixed-budget" options={{ href: null }} />
    </Tabs>
  );
}

const styles = {
  desktopTabBar: {
    backgroundColor: colors.navigationBackground,
    borderRightColor: colors.borderStrong,
    borderRightWidth: semantic.borderWidth.default,
    paddingHorizontal: primitives.space["2"],
    paddingTop: primitives.space["4"],
    width: primitives.space["16"] + primitives.space["6"],
  },
  desktopTabItem: {
    minHeight: primitives.space["16"],
  },
  tabBar: {
    backgroundColor: colors.navigationBackground,
    borderTopColor: colors.borderStrong,
    borderTopWidth: semantic.borderWidth.default,
    minHeight: primitives.space["16"],
    paddingTop: primitives.space["2"],
  },
  tabItem: {
    minHeight: primitives.size.controlMd,
  },
  tabLabel: {
    fontSize: primitives.fontSize.xs,
    fontWeight: semiboldFontWeight,
  },
} as const;
