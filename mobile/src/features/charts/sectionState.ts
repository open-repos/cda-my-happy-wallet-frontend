export interface SectionState<T> {
  status: "loading" | "error" | "success";
  data?: T;
}

export type SectionView = "loading" | "error" | "empty" | "content";

/** Relance le chargement en gardant les dernières données affichées (#154). */
export const sectionLoading = <T>(state: SectionState<T>): SectionState<T> => ({
  status: "loading",
  data: state.data,
});

/**
 * Ce que la carte affiche : un rechargement ne remplace pas un graphique déjà
 * dessiné, qui reste monté et garde son instance ECharts. Un échec, même
 * après un premier affichage, présente l'erreur et sa relance.
 */
export const sectionView = <T>(
  state: SectionState<T>,
  isEmpty: (data: T) => boolean,
): SectionView => {
  if (state.status === "error") return "error";
  if (state.data === undefined) return "loading";
  return isEmpty(state.data) ? "empty" : "content";
};
