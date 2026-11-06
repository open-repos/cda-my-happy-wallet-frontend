# Tri et filtres depuis les en-têtes de colonnes (#361)

Parent : #359 (décisions produit D1 à D7). Contrats backend :
open-repos/cda-my-happy-wallet-backend#165 (tri et filtres de
`GET /operations`) et #174 (`GET /operations/suggestions/titles`). Champ de
filtre partagé : [`FilterCombobox`](web-filter-combobox.md) (#360).

## Tableaux concernés

| Tableau                  | Tri et filtres           | Colonnes triables                                     | Filtres                                                                    |
| ------------------------ | ------------------------ | ----------------------------------------------------- | -------------------------------------------------------------------------- |
| Opérations ponctuelles   | par l’API, toute la base | Date, Libellé, Catégorie, Montant                     | dates du… au…, libellé (suggestions), catégories, type, montant min et max |
| Charges et entrées fixes | dans le navigateur       | Périodicité, Libellé, Catégorie, Type, Personnel/mois | périodicité, libellé, catégories, type                                     |

La colonne Type des opérations ponctuelles se filtre sans se trier (D2). Les
charges fixes sont chargées en entier avant affichage : les trier dans le
navigateur donne le même résultat que le serveur (D1).

## Comportement

- Un clic sur le nom d’une colonne triable alterne croissant, décroissant puis
  sans tri. Un état identique à l’ordre par défaut est sauté : sur la colonne
  Date des opérations (ou Personnel / mois des fixes), le clic alterne donc
  croissant et ordre par défaut. Un seul tri est actif à la fois (D3). Sans tri, l’ordre par défaut
  s’applique : plus récentes d’abord pour les opérations, personnel par mois
  décroissant pour les fixes. La colonne correspondante l’indique alors.
- `aria-sort` n’est posé que sur la colonne triée, avec `ascending` ou
  `descending`. La flèche est décorative. Le nom accessible du bouton donne
  l’état et l’effet du prochain clic, par exemple « Trier : Montant, trié par ordre
  croissant. Activer pour trier par ordre décroissant. ». Chaque changement de
  tri est annoncé dans une région `status`.
- Les filtres se combinent en ET ; plusieurs catégories se combinent en OU.
  « Effacer les filtres » apparaît dès qu’un filtre est actif et garde le tri.
- Une date s’applique dès qu’elle est complète. Un montant s’applique au départ
  du champ ou sur Entrée, au format `12,50`. Une plage inversée ou un montant
  invalide n’est pas appliqué : l’erreur est reliée aux deux champs.
- Opérations ponctuelles : chaque changement relance la liste depuis la
  première page, car un curseur est lié au tri et aux filtres (#165). La liste
  reste affichée pendant l’actualisation (`aria-busy`) ; « Afficher la suite »
  attend sa fin, car le curseur précédent serait refusé. Un échec garde les
  lignes précédentes et propose « Réessayer l’actualisation ».
- Avec un filtre actif et aucun résultat, le tableau reste affiché avec
  « Aucune opération ne correspond à ces filtres. » au lieu de l’état vide de
  première utilisation.
- L’édition en ligne désactive le tri et les filtres jusqu’à sa fin.

### URL

Tri et filtres sont conservés dans l’URL (D3) : Retour, rechargement et favori
les retrouvent. Les noms sont ceux de l’API pour les opérations ponctuelles :
`sort`, `order`, `from`, `to`, `title`, `categoryId` (répété), `type`,
`minAmount`, `maxAmount`. Les charges fixes utilisent `sort` (un des 9 critères
existants), `order`, `title`, `categoryId` (`none` pour « Non catégorisé »),
`type` (`charge` ou `income`) et `period`. Une valeur invalide dans l’URL est
ignorée plutôt que transmise, car l’API la refuserait en `422`. Les autres
paramètres de l’URL sont conservés.

## Présentation selon la largeur

- À partir de 64rem, le tableau affiche ses en-têtes : chaque colonne
  filtrable porte son champ sous son nom. Tous les titres ont la même hauteur,
  avec ou sans bouton de tri, et tous les champs la même taille : les filtres
  sont alignés sur une ligne. Une plage (dates, montants) tient sur un bouton
  qui résume la valeur (« Toutes », « 01/10/2026 – 31/10/2026 », « ≥ 12,50 »)
  et ouvre ses deux bornes dans une petite fenêtre ; Échap ou un clic à
  l’extérieur la ferment, Échap rend le focus au bouton.
- En dessous, le tableau devient une liste de cartes et ses en-têtes sont
  masqués. Le bouton « Trier et filtrer (n filtres) » ouvre un panneau qui
  regroupe le tri et tous les filtres, empilés sur une colonne.
- À toutes les largeurs, ce panneau propose « Trier par » et « Ordre du tri »
  avec tous les critères. Les charges fixes gardent ainsi leurs 9 critères,
  y compris ceux sans colonne (total par échéance, devise, part, personnel par
  échéance) : le remplacement des anciennes listes déroulantes ne retire
  aucune fonction.
- Les filtres ne sont rendus qu’à un endroit à la fois (`useMediaQuery`), pour
  éviter des champs en double.

## Architecture

| Fichier                                                  | Rôle                                                          |
| -------------------------------------------------------- | ------------------------------------------------------------- |
| `utils/tableQuery.js`                                    | Cycle de tri, libellés accessibles, URL, filtres locaux       |
| `components/TableQuery/TableQueryPanel.jsx`              | Bouton « Trier et filtrer », panneau, « Effacer les filtres » |
| `components/TableQuery/ColumnFilters.jsx`                | `SelectFilter` et `RangeFilter` (dates, montants)             |
| `components/OneOffOperations/useOperationTableQuery.jsx` | En-têtes et filtres des opérations ponctuelles                |
| `components/OperationsFixes/useFixedTableQuery.jsx`      | En-têtes et filtres des charges et entrées fixes              |
| `components/CompactOperations/CompactMoneyList.jsx`      | Rend en-têtes triables et filtres fournis par l’écran         |
| `hooks/useOneOffOperations.js`                           | Requête transmise à l’API, retour à la première page          |
| `css/TableQuery.css`                                     | Styles, tokens `--ds-*`, cibles de 44 px                      |

## Limites connues

- Le tri par montant compare les nombres sans conversion de devise (D7).
- Le filtre de libellé accepte le texte saisi librement (`freeText`, #377),
  appliqué avec Entrée ou en quittant le champ, ou une suggestion. La
  recherche contient le texte et ignore la casse et les accents (#165, #174) ;
  la saisie est bornée à 50 caractères, comme l'API.
- Les maquettes Figma n’étaient pas accessibles depuis la session de
  réalisation (MCP Figma non autorisé) : la présentation suit les composants
  et tokens existants.

## Tests

- `test/vitest/tableQuery.test.js` : cycle de tri, libellés, URL, valeurs
  invalides, filtres locaux.
- `test/vitest/columnFilters.test.jsx` : bornes, erreurs, panneau.
- `test/vitest/compactMoneyList.test.jsx`, `useOneOffOperations.test.jsx`,
  `oneOffOperationsService.test.js`, `oneOffOperationsPage.test.jsx`,
  `fixedOperations.test.jsx` : en-têtes, requête API, URL, état vide filtré.
- `test/e2e/tableHeaders.spec.js` : 320, 390, 768 et 1440 px, thèmes clair et
  sombre, en-têtes ou panneau, rechargement de l’URL, effacement.
