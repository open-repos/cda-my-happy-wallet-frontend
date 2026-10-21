import Ionicons from "@expo/vector-icons/Ionicons";
import { Tabs, useTheme } from "expo-router";
import {
  Platform,
  Text,
  useWindowDimensions,
  type ColorValue,
} from "react-native";

import {
  APP_DESTINATIONS,
  AppDestination,
} from "@/src/navigation/appDestinations";
import { primitives, semantic, themes } from "@/src/design/tokens";
import { TAB_LABEL_TEXT_PROPS } from "@/src/navigation/tabLabel";

const colors = themes.light.color;
const desktopNavigationBreakpoint = 1024;
// Seuil tablette de React Navigation. La position des libellés est fixée :
// déduite, elle dépendrait du nombre de routes, onglets cachés compris.
const tabletBreakpoint = 768;
const semiboldFontWeight = `${primitives.fontWeight.semibold}` as "600";

type TabLabelProps = {
  color: ColorValue;
  children: string;
};

// Libellé sous l'icône borné avec les grandes polices (#155) ; le nom
// accessible complet reste `tabBarAccessibilityLabel`. La police du thème
// est celle du libellé par défaut de React Navigation.
const BoundedTabLabel = ({ color, children }: TabLabelProps) => {
  const { fonts } = useTheme();
  return (
    <Text
      {...TAB_LABEL_TEXT_PROPS}
      style={[fonts.medium, styles.tabLabel, { color }]}
    >
      {children}
    </Text>
  );
};

const renderBoundedTabLabel = (props: TabLabelProps) => (
  <BoundedTabLabel {...props} />
);

const createTabOptions = (
  destination: AppDestination,
  labelBelowIcon: boolean,
) => ({
  title: destination.label,
  ...(labelBelowIcon ? { tabBarLabel: renderBoundedTabLabel } : {}),
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
  const labelBelowIcon = !usesDesktopNavigation && width < tabletBreakpoint;

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
        tabBarLabelPosition:
          usesDesktopNavigation || labelBelowIcon
            ? "below-icon"
            : "beside-icon",
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
          options={createTabOptions(destination, labelBelowIcon)}
        />
      ))}
      <Tabs.Screen name="fixed-budget" options={{ href: null }} />
      <Tabs.Screen name="categories" options={{ href: null }} />
      <Tabs.Screen name="upcoming-months" options={{ href: null }} />
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
    textAlign: "center",
  },
} as const;
