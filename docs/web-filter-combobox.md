# Champ de filtre partagé — `FilterCombobox` (#360)

Parent : #359 (tri et filtre depuis les en-têtes de colonnes). Contrat backend
des suggestions : open-repos/cda-my-happy-wallet-backend#174, livré.
Maquette validée par le propriétaire le 5 novembre 2026, avec un ajout : le
choix de plusieurs valeurs.

## Usage

```jsx
import { FilterCombobox } from "../Fields/FilterCombobox";

<FilterCombobox
  label="Filtrer par titre" // nom accessible ; hideLabel le masque visuellement
  value={filter} // option {value, label} ou null
  onChange={setFilter} // reçoit l'option choisie, ou null après effacement
  loadOptions={loadTitleSuggestions}
/>;

<FilterCombobox
  label="Filtrer par catégorie"
  multiple
  value={categories} // tableau d'options
  onChange={setCategories} // reçoit le nouveau tableau
  loadOptions={loadCategorySuggestions}
/>;
```

Props facultatives : `hideLabel`, `placeholder` (« Rechercher… »), `pageSize`
(10), `debounceMs` (250), `disabled`, `id`, `className`.

### Source de données

`loadOptions({ query, cursor, limit, signal })` est la seule dépendance. Elle
renvoie l'enveloppe des collections paginées du backend
(`docs/api-pagination.md` côté backend) :

```js
{ data: [{ value, label }], meta: { hasNext, nextCursor } }
```

- `cursor` vaut `null` pour la première page, puis le `nextCursor` reçu, sans
  interprétation.
- `signal` doit être transmis à la requête HTTP (`axios` accepte `{ signal }`) :
  le composant annule chaque requête devenue inutile.
- `value` sert de clé : deux options de même `value` sont dédoublonnées.
- `createArrayOptionSource(options)` (`utils/filterOptions.js`) sert une liste
  locale avec le même contrat, pour les tests et les petites listes.

Depuis #361, les en-têtes des tableaux d'opérations branchent le composant :
libellés via `oneOffOperationsService.listTitleSuggestions` (#174), catégories
et libellés des charges fixes via `createArrayOptionSource`. Voir
[web-table-headers.md](web-table-headers.md).

## Comportement

- À l'ouverture (clic, flèche bas ou saisie), les 10 premières valeurs
  s'affichent, sans attendre de texte.
- La saisie est temporisée de 250 ms. Chaque nouvelle saisie efface les
  suggestions, annule la requête précédente et ignore toute réponse arrivée
  en retard : une ancienne recherche n'est jamais affichée.
- La recherche de la source simulée et la mise en évidence ignorent casse et
  accents ; pour le serveur, la règle sera celle de #165.
- La page suivante se charge à 48 px du bas de la liste. Si la première page
  ne remplit pas la liste, la suivante est demandée sans défilement.
- Seule une valeur de la liste s'applique. En mode simple, le texte libre ne
  sert qu'à chercher : en quittant le champ, il revient au libellé de la
  valeur choisie.
  La réouverture affiche à nouveau les premières valeurs, la valeur choisie
  cochée.
- Entrée sans valeur active n'est pas interceptée : dans un `<form>`, elle
  soumet le formulaire. L'intégration aux tableaux (#359) devra en tenir compte.
- En mode `multiple`, chaque choix coche ou décoche une valeur. La liste reste
  ouverte et la saisie est conservée. Les valeurs choisies apparaissent en
  étiquettes sous le champ, chacune avec un bouton « Retirer … ».

### Clavier

| Touche   | Effet                                                                                                        |
| -------- | ------------------------------------------------------------------------------------------------------------ |
| ↓        | Ouvre la liste, puis passe à la valeur suivante                                                              |
| ↓ en bas | Charge la page suivante et y place la sélection, ou réessaie après erreur                                    |
| ↑        | Valeur précédente                                                                                            |
| Entrée   | Choisit la valeur active (la coche ou la décoche en mode multiple)                                           |
| Échap    | Ferme la liste et rétablit le libellé choisi ; liste fermée : efface la saisie (et la valeur en mode simple) |
| Tab      | Ferme sans choisir                                                                                           |

Début et Fin restent dédiés au déplacement dans le texte, comme dans un combobox
éditable du guide ARIA (APG).

### Accessibilité

- Motif ARIA « combobox éditable avec liste » : `role="combobox"` sur le champ,
  `aria-autocomplete="list"`, `aria-expanded`, `aria-controls`, option active par
  `aria-activedescendant`. Le focus reste toujours dans le champ.
- En mode multiple, la liste porte `aria-multiselectable` et chaque option son
  `aria-selected`. Le champ est décrit par le résumé « 2 valeurs choisies : … ».
- Les états chargement, erreur (avec « Réessayer »), aucun résultat et fin de
  liste sont affichés dans la liste. Une région `status` annonce le nombre de
  valeurs, les pages ajoutées, la fin de liste, l'erreur et chaque ajout ou
  retrait.
- Cibles de 44 px pour les options, contour de focus `--ds-color-focus-ring`.
  Toutes les couleurs viennent des tokens `--ds-*`.

## Architecture

| Fichier                                | Rôle                                                                |
| -------------------------------------- | ------------------------------------------------------------------- |
| `components/Fields/FilterCombobox.jsx` | Rendu, clavier, choix simple ou multiple, annonces                  |
| `hooks/usePaginatedOptions.js`         | Temporisation, annulation, pages, dédoublonnage, états              |
| `hooks/useAnchoredPopup.js`            | Placement fixe borné à la zone visible, partagé avec `ChoiceSelect` |
| `utils/filterOptions.js`               | Comparaison sans accents, mise en évidence, source locale           |
| `css/FilterCombobox.css`               | Styles, sur la même géométrie que `ChoiceSelect`                    |

`ChoiceSelect` reste le sélecteur sans saisie des formulaires (catégories). Les
deux composants partagent le placement de la liste, pas leur logique.

## Mobile

La liste s'ouvre sous le champ, ou au-dessus s'il y a plus de place. Elle fait
au moins 288 px de large, bornée à l'écran, et sa hauteur est limitée par la
zone visible, clavier virtuel compris. Pas de feuille plein écran.

## Tests

- `test/vitest/filterOptions.test.js`, `usePaginatedOptions.test.jsx`,
  `filterCombobox.test.jsx` : contrat de la source, temporisation, annulation,
  réponses obsolètes, pages sans doublon, erreur et nouvel essai, clavier,
  ARIA, choix multiple.
- `test/e2e/filterCombobox.spec.js` sur le banc d'essai
  `test/e2e/harness/filter-combobox.html`, servi uniquement par le serveur de
  développement et absent du build : 320, 390, 768 et 1440 px en clair et
  sombre, défilement infini jusqu'à la fin, clavier, temporisation, erreur,
  choix multiple et en-tête de tableau étroit.
