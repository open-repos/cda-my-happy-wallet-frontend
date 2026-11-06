# Décisions techniques

## #220 — Adaptateur React Font Awesome 0.2.6

Le Web utilise `@fortawesome/react-fontawesome` **0.2.6**, verrouillé exactement
dans `package.json` et `package-lock.json`, à la place de 0.1.18. Cette version
supprime l'utilisation de `defaultProps` qui déclenchait un avertissement avec
React 18.3.1. Les métadonnées npm de 0.2.6 déclarent React 16.3, 17, 18 et 19,
ainsi que Font Awesome SVG Core 1, 6 et 7 comme pairs compatibles.

Les sept fichiers Web utilisant `FontAwesomeIcon` transmettent des définitions
d'icône de Font Awesome 6. Les cinq définitions utilisées, les tracés SVG,
`className`, `title` et les attributs `aria-*` sont couverts avec le vrai
composant. Le tableau des opérations fixes n'en simule plus le rendu, afin que
son test d'absence d'avertissements protège aussi cette intégration.

Le registre npm marque aussi la branche 0.2 comme dépréciée et recommande 3.1.1
ou supérieur. Le périmètre explicitement demandé par #220 reste 0.2.6 ; une
migration vers 3.x nécessite une tâche dédiée et une revue de compatibilité.
Le passage de 0.1 à 0.2 reste traité comme un changement potentiellement
incompatible, conformément au versionnement des paquets en 0.x.

Seul l'adaptateur React change de version : le moteur SVG et les packs d'icônes
conservent leurs versions verrouillées. Aucun changement applicatif ou mobile
n'est requis. Les tests de développement vérifient l'absence d'avertissement
Font Awesome ; les suites Playwright existantes protègent les parcours et les
captures visuelles. Le résultat effectivement exécuté et les éventuelles
limites d'environnement sont consignés dans la PR.

Retour arrière : révoquer le commit de cette PR et exécuter `npm ci`. Cela
réintroduit l'avertissement de 0.1.18 sans changer les contrats applicatifs.
