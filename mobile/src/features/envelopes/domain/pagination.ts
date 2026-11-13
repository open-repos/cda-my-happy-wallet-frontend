import { CollectionPage } from "@/src/features/operations/domain/oneOffOperation";

export interface PagedRows<T> {
  rows: T[];
  cursor: string | null;
  /** Curseurs déjà lus avec succès. */
  seen: ReadonlySet<string>;
}

export const firstPage = <T>(page: CollectionPage<T>): PagedRows<T> => ({
  rows: page.data,
  cursor: page.meta.hasNext ? page.meta.nextCursor : null,
  seen: new Set(),
});

/** Un curseur déjà lu ne doit pas être redemandé (boucle serveur). */
export const isRepeatedCursor = <T>(state: PagedRows<T>) =>
  state.cursor !== null && state.seen.has(state.cursor);

/**
 * Ajoute la page lue avec `state.cursor`, comme le Web (#314) : le curseur
 * n'est mémorisé qu'après ce succès, et les lignes déjà présentes (même
 * `id`) ne sont pas dupliquées. `identity` distingue des lignes de sources
 * différentes qui partagent un `id` (compte courant du Coffre, #419).
 */
export const appendPage = <T extends { id: number }>(
  state: PagedRows<T>,
  page: CollectionPage<T>,
  identity: (row: T) => string | number = (row) => row.id,
): PagedRows<T> => {
  const known = new Set(state.rows.map(identity));
  return {
    rows: [
      ...state.rows,
      ...page.data.filter((row) => !known.has(identity(row))),
    ],
    cursor: page.meta.hasNext ? page.meta.nextCursor : null,
    seen:
      state.cursor === null
        ? state.seen
        : new Set([...state.seen, state.cursor]),
  };
};
