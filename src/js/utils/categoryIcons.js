/**
 * Icônes de catégorie Font Awesome Free au format `<style>:<nom>`. La liste
 * autorisée et les tracés viennent de `src/assets/category-icons.json`, chargé
 * à la demande (voir `categoryIconPack.js`).
 */

const STYLE_LABELS = { solid: "plein", regular: "contour" };

/**
 * Icônes proposées avant toute recherche. Les noms Font Awesome sont en
 * anglais : les mots-clés français permettent de les retrouver.
 */
export const SUGGESTED_ICONS = [
  {
    icon: "solid:cart-shopping",
    keywords: ["courses", "supermarché", "épicerie", "alimentation"],
  },
  {
    icon: "solid:utensils",
    keywords: ["restaurant", "repas", "cantine", "alimentation"],
  },
  { icon: "solid:mug-hot", keywords: ["café", "boisson", "bar"] },
  {
    icon: "solid:house",
    keywords: ["logement", "loyer", "maison", "immobilier"],
  },
  {
    icon: "solid:bolt",
    keywords: ["énergie", "électricité", "gaz", "charges"],
  },
  { icon: "solid:wifi", keywords: ["internet", "box", "abonnement"] },
  { icon: "solid:mobile-screen", keywords: ["téléphone", "mobile", "forfait"] },
  { icon: "solid:car", keywords: ["voiture", "auto", "véhicule"] },
  { icon: "solid:gas-pump", keywords: ["carburant", "essence", "plein"] },
  { icon: "solid:bus", keywords: ["transport", "bus", "métro"] },
  { icon: "solid:train", keywords: ["train", "trajet"] },
  { icon: "solid:plane", keywords: ["vacances", "voyage", "avion"] },
  {
    icon: "solid:heart-pulse",
    keywords: ["santé", "médecin", "pharmacie", "mutuelle"],
  },
  { icon: "solid:graduation-cap", keywords: ["études", "école", "formation"] },
  { icon: "solid:book", keywords: ["livres", "culture", "lecture"] },
  { icon: "solid:film", keywords: ["cinéma", "sorties", "loisirs"] },
  { icon: "solid:music", keywords: ["musique", "concert"] },
  { icon: "solid:gamepad", keywords: ["jeux", "loisirs"] },
  { icon: "solid:dumbbell", keywords: ["sport", "salle"] },
  { icon: "solid:shirt", keywords: ["vêtements", "habillement", "shopping"] },
  { icon: "solid:scissors", keywords: ["coiffeur", "beauté"] },
  { icon: "solid:gift", keywords: ["cadeaux", "fêtes"] },
  { icon: "solid:paw", keywords: ["animaux", "vétérinaire"] },
  { icon: "solid:baby", keywords: ["enfants", "bébé", "garde"] },
  { icon: "solid:umbrella", keywords: ["assurance"] },
  { icon: "solid:receipt", keywords: ["factures", "impôts"] },
  { icon: "solid:building-columns", keywords: ["banque", "frais bancaires"] },
  { icon: "solid:briefcase", keywords: ["travail", "frais professionnels"] },
  { icon: "solid:money-bill", keywords: ["salaire", "revenu", "espèces"] },
  {
    icon: "solid:hand-holding-dollar",
    keywords: ["aides", "remboursement", "revenus"],
  },
  { icon: "solid:piggy-bank", keywords: ["épargne", "économies"] },
  { icon: "solid:wallet", keywords: ["argent", "divers"] },
];

const normalize = (value) =>
  value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

const nameOf = (icon) => icon.slice(icon.indexOf(":") + 1);

/**
 * Icônes correspondant à `query` parmi `available` : d'abord les suggestions
 * dont un mot-clé français correspond, puis les noms Font Awesome qui
 * contiennent la recherche (ceux qui commencent par elle en premier).
 */
export const searchCategoryIcons = (query, available, limit = 48) => {
  const text = normalize(query);
  if (!text) return SUGGESTED_ICONS.map(({ icon }) => icon).slice(0, limit);
  const allowed = new Set(available);
  const byKeyword = SUGGESTED_ICONS.filter(({ keywords }) =>
    keywords.some((keyword) => normalize(keyword).includes(text))
  ).map(({ icon }) => icon);
  const slug = text.replace(/\s+/g, "-");
  const byName = available
    .filter((icon) => nameOf(icon).includes(slug))
    .sort(
      (left, right) =>
        Number(!nameOf(left).startsWith(slug)) -
          Number(!nameOf(right).startsWith(slug)) || left.localeCompare(right)
    );
  return [...new Set([...byKeyword, ...byName])]
    .filter((icon) => allowed.has(icon))
    .slice(0, limit);
};

/** « cart shopping (plein) » : nom lisible annoncé pour une icône. */
export const iconLabel = (icon) => {
  const [style] = icon.split(":");
  return `${nameOf(icon).replace(/-/g, " ")} (${STYLE_LABELS[style] ?? style})`;
};

/** Icône en image SVG colorée, pour les graphiques ECharts. */
export const iconDataUri = ([width, height, path], color) =>
  `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}"><path fill="${color}" d="${path}"/></svg>`
  )}`;
