# Explorateur de graphiques Web

La route authentifiée `/analyses`, accessible depuis la barre latérale
(icône FontAwesome `faChartColumn`) et le lien « Explorer » de la carte des
dépenses de l'accueil, affiche l'agrégat
`GET /v1/analytics/operations` (backend `docs/analytics-api.md`) avec Apache
ECharts.

## Choix

| Contrôle          | Valeurs                                                         |
| ----------------- | --------------------------------------------------------------- |
| Indicateur        | Dépenses (`kind=DEPENSE`), Entrées (`kind=ENTREE`), Solde net   |
| Regrouper par     | Jour, Semaine, Mois, Année, Catégorie, Type d'opération         |
| Ventiler          | Aucune, Par catégorie, Par type (regroupements temporels seuls) |
| Type de graphique | selon le regroupement, voir ci-dessous                          |
| Période           | Ce mois, 3 ou 12 derniers mois, Année civile, Personnalisée     |

Types proposés :

- temps sans ventilation : barres, lignes, aires ;
- temps ventilé : barres empilées, lignes, aires empilées ;
- catégorie ou type : secteurs et barres horizontales; barres seules pour le
  solde net, qui peut être négatif.

Les choix sont dans l'URL (`metric`, `groupBy`, `splitBy`, `chart`,
`period`, `from`, `to`) : un lien partagé ou le retour arrière restaurent la
vue. Une valeur invalide ou incompatible prend sa valeur par défaut (dépenses
du mois par catégorie, en secteurs). Les presets couvrent des mois complets et
la date du jour suit l'horloge `Europe/Paris`.

## Bornes et états

Les bornes de l'API (366 jours, 156 semaines, 120 mois, 30 ans, 500 points)
sont vérifiées avant l'appel et expliquées; une ventilation par catégorie
dépend des données et seul le `422 ANALYTICS_RANGE_TOO_LARGE` de l'API la
tranche. La page affiche chargement, période refusée, erreur avec
`Réessayer`, période vide et succès. Seule la dernière requête met à jour
l'affichage.

## Graphique et accessibilité

- Options pures dans `src/js/components/charts/analyticsChartOptions.js` :
  libellés français des seaux, montants en euros dans l'infobulle, couleurs
  des catégories, sens en couleurs d'entrée/dépense, solde coloré selon son
  signe, zoom et défilement (`dataZoom`) au-delà de 31 points temporels, sur
  les 31 derniers par défaut.
- Le conteneur porte un libellé français; l'aria automatique d'ECharts est
  désactivé. Un tableau des valeurs (colonnes par série et total) suit le
  graphique, dans une zone focalisable et défilante au clavier.
- Les modules ECharts ajoutés (`DataZoomInside`, `DataZoomSlider`) restent dans
  le chunk chargé à la demande.

## Références UX

Pas de nœud Figma dédié : la page reprend les cartes de surface, contrôles et
tokens de l'accueil (`403:28042`, `403:28124`) et du moodboard `353:27068`.
