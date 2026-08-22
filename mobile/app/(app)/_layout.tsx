import Ionicons from "@expo/vector-icons/Ionicons";
import { Tabs } from "expo-router";
import type { ColorValue } from "react-native";

import {
  APP_DESTINATIONS,
  AppDestination,
} from "@/src/navigation/appDestinations";
import { primitives, semantic, themes } from "@/src/design/tokens";

const colors = themes.light.color;
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
  return (
    <Tabs
      backBehavior="history"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.navigationActive,
        tabBarInactiveTintColor: colors.navigationText,
        tabBarHideOnKeyboard: true,
        tabBarItemStyle: styles.tabItem,
        tabBarLabelStyle: styles.tabLabel,
        tabBarStyle: styles.tabBar,
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
