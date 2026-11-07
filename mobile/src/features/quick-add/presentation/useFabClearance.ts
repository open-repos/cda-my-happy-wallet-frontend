// Même module que les onglets de `app/(app)/_layout.tsx` : même contexte.
import { useBottomTabBarHeight } from "expo-router/js-tabs";
import { useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { fabClearance } from "./fabLayout";

/**
 * `paddingBottom` d'un écran d'onglet qui dégage le bouton flottant en fin
 * de défilement (#407) ; à placer après le style de contenu de l'écran.
 */
export const useFabClearance = (base: number) => {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  return {
    paddingBottom: fabClearance({
      base,
      width,
      insetBottom: insets.bottom,
      tabBarHeight,
    }),
  };
};
