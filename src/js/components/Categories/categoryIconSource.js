import iconsUrl from "../../../assets/category-icons.json?url";

/**
 * Télécharge les tracés des icônes autorisées. `fetch` plutôt qu'`import()` :
 * un navigateur garde en cache l'échec d'un `import()`, alors qu'un `fetch`
 * peut être retenté (coupure réseau, chunk retiré par un déploiement).
 */
export const fetchCategoryIcons = async () => {
  const response = await fetch(iconsUrl);
  if (!response.ok) {
    throw new Error(`Category icons request failed: ${response.status}`);
  }
  return (await response.json()).icons;
};
