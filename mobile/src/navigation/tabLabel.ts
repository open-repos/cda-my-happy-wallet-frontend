/**
 * Libellés de la barre d'onglets mobile avec les grandes polices (#155).
 *
 * Un onglet du Pixel 5 mesure environ 78 dp : à l'échelle 2,0, « Opérations »
 * serait tronqué. Le libellé suit la préférence système jusqu'à 1,3, puis
 * rétrécit pour tenir sur une ligne au lieu d'être coupé. Le nom accessible
 * complet reste porté par `tabBarAccessibilityLabel`.
 */
export const TAB_LABEL_MAX_FONT_SCALE = 1.3;

export const TAB_LABEL_TEXT_PROPS = {
  adjustsFontSizeToFit: true,
  maxFontSizeMultiplier: TAB_LABEL_MAX_FONT_SCALE,
  minimumFontScale: 0.75,
  numberOfLines: 1,
} as const;

/** Taille rendue d'un libellé pour l'échelle de police du système. */
export const tabLabelFontSize = (baseSize: number, systemFontScale: number) =>
  baseSize * Math.min(systemFontScale, TAB_LABEL_MAX_FONT_SCALE);
