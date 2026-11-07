/**
 * Position du bouton flottant d'ajout (téléphone seulement), partagée par
 * `QuickAddProvider` et la marge basse des écrans d'onglets (#407).
 */
export const FAB_SIZE = 56;
/** Distance depuis le bas de l’écran (barre d’onglets incluse), hors marge système. */
export const FAB_OFFSET = 80;
/** Le bouton n'est affiché que sous cette largeur. */
export const FAB_MAX_WIDTH = 768;
/** Espace laissé entre le dernier contenu et le haut du bouton. */
const FAB_GAP = 16;

/**
 * Marge basse d'un écran d'onglet : celle de l'écran, ou de quoi dégager
 * entièrement le bouton en fin de défilement s'il est affiché.
 */
export const fabClearance = ({
  base,
  width,
  insetBottom,
  tabBarHeight,
}: {
  base: number;
  width: number;
  insetBottom: number;
  tabBarHeight: number;
}): number => {
  if (width >= FAB_MAX_WIDTH) return base;
  // Haut du bouton au-dessus du bas du contenu (posé sur la barre d'onglets).
  const fabTop = FAB_OFFSET + insetBottom + FAB_SIZE - tabBarHeight;
  return Math.max(base, fabTop + FAB_GAP);
};
