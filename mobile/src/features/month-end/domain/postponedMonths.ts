/**
 * « Plus tard » (#420) : le bandeau devient un rappel jusqu'à la fermeture
 * de l'application. Rien n'est stocké sur l'appareil ni sur le serveur ;
 * sans réponse, tout le solde reste reporté.
 */
export const createPostponedMonths = () => {
  const months = new Set<string>();
  const listeners = new Set<() => void>();
  return {
    has: (month: string) => months.has(month),
    add: (month: string) => {
      if (months.has(month)) return;
      months.add(month);
      listeners.forEach((listener) => listener());
    },
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
};

/** Mémoire partagée par l'Accueil et l'écran « Décider ». */
export const postponedMonths = createPostponedMonths();
