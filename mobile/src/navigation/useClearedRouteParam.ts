import { useNavigation, useRootNavigationState, useRouter } from "expo-router";
import { useEffect } from "react";

/**
 * Retire un paramètre sensible ou à usage unique de la route de l'écran
 * (#219).
 *
 * Un `setParams` lancé au montage est perdu tant que le routeur hydrate son
 * état initial : l'effet se relance donc à chaque changement de l'état racine,
 * jusqu'à ce que le paramètre ait disparu. `router.setParams` vise la route
 * focalisée : il n'est appelé que si c'est celle de l'écran, pour ne jamais
 * modifier une autre route (ni boucler sur elle).
 */
export const useClearedRouteParam = (
  name: string,
  value: string | undefined,
) => {
  const router = useRouter();
  const navigation = useNavigation();
  const rootState = useRootNavigationState();

  useEffect(() => {
    if (value !== undefined && navigation.isFocused()) {
      router.setParams({ [name]: undefined });
    }
  }, [name, navigation, rootState, router, value]);
};
