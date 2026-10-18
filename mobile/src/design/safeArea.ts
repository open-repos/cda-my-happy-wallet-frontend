import type { Edge } from "react-native-safe-area-context";

/**
 * Bords protégés des écrans à onglets. La barre d'onglets applique déjà la
 * marge du bas (`insets.bottom`) : la reprendre ici la doublerait (#147).
 * Les écrans hors onglets et les modales gardent tous leurs bords.
 */
export const TAB_SCREEN_EDGES: readonly Edge[] = ["top", "left", "right"];
