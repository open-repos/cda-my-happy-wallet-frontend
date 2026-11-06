# Enveloppes budgétaires Web/PWA (#314)

Parcours « Cartes intégrées » validé par le propriétaire. Contrat serveur :
[backend #140](https://github.com/open-repos/cda-my-happy-wallet-backend/pull/140),
commit `ef263fca1c3538001b70b70f4880848d805cea83`, lié à #139.
Le backend doit être fusionné et ses migrations appliquées pour utiliser ces API.
Cette PR frontend ne fusionne ni ne déploie le backend.

Aperçus de la recette avec données synthétiques, archivés au tag v1.11.0 :
[accueil sur téléphone, thème clair](https://github.com/open-repos/cda-my-happy-wallet-frontend/blob/v1.11.0/docs/previews/314-home-mobile-light.png) et
[analyse sur bureau, thème sombre](https://github.com/open-repos/cda-my-happy-wallet-frontend/blob/v1.11.0/docs/previews/314-analysis-desktop-dark.png).

La clarification propriétaire remplace les exemples initiaux de #314 concernant
le loyer et le salaire : **seules les charges mensuelles explicitement marquées
comme enveloppes** reçoivent des dépenses réelles. Les entrées fixes, charges
ordinaires et charges non mensuelles sont exclues du rapprochement.

## Déclarer et ajuster une enveloppe

Dans « Charges et entrées fixes », créer une charge mensuelle et cocher
« Utiliser comme enveloppe budgétaire mensuelle ». Le mode est désactivé par
défaut. Une catégorie peut être choisie indépendamment. Le montant total et la
participation personnelle conservent leur rôle : la part prévue est calculée
par le serveur ; les dépenses saisies correspondent à la part personnelle.

Une enveloppe reste la même charge, sans création d’un deuxième budget à
additionner. Le formulaire désactive le choix d’enveloppe pour les autres
périodicités. Passer à une périodicité non mensuelle décoche ce mode.

À l’édition, « Appliquer la modification à partir de » permet de choisir le mois
courant ou l’un des 23 suivants. Le mois courant est le choix initial pour
préserver le parcours d’édition existant. Choisir le **prochain mois** pour
préparer un changement sans modifier le mois courant ni les précédents. Cette
commande existe aussi sur les revenus, sans flag d’enveloppe.

La modification envoie le formulaire complet et `effectiveMonth`, par exemple
`2026-11`. La liste principale continue d’afficher les valeurs courantes.
« Vérifier les charges et entrées du prochain mois » affiche les définitions
applicables au mois sélectionné, après relecture du serveur. Les bilans clôturés
ne sont pas modifiés. Le serveur refuse une modification incompatible avec des
dépenses déjà rattachées ; le brouillon reste affiché avec l’erreur.

L’archivage d’une enveloppe sans dépenses liées est accessible depuis ses
détails, avec confirmation. Le serveur reste autoritaire, notamment en présence
d’autres occurrences ouvertes avec des liens. Pour une enveloppe déjà utilisée,
préparer une modification datée depuis sa charge. Les occurrences et dépenses
historiques restent consultables.

## Saisir depuis le calendrier ou les opérations

Le FAB et les formulaires d’édition partagent le même composant de rattachement.
Le calendrier conserve sa date sélectionnée. Le formulaire conserve le titre,
le montant, la devise, le type et la catégorie lors des erreurs.

1. Choisir « Dépense », sa date et sa catégorie.
2. Le champ « Rattacher à une enveloppe » charge les occurrences du même mois et
   de la même devise. « Aucun rattachement » reste le choix initial.
3. Une suggestion de catégorie, même unique, demande un clic « Choisir… ».
   Plusieurs candidats restent présentés séparément. Ajouter depuis une
   enveloppe propose cette enveloppe sans l’enregistrer automatiquement.
4. Enregistrer : un seul POST/PUT envoie la dépense et son association.

```json
{
  "title": "Courses",
  "amount": "85.00",
  "currency": "EUR",
  "kind": "DEPENSE",
  "operationDate": "2026-10-28",
  "categoryId": 4,
  "reconciliation": {
    "occurrenceId": 41,
    "expectedOccurrenceId": null
  }
}
```

En édition, l’état actuel du lien est relu. Un changement explicite envoie
`expectedOccurrenceId` pour éviter d’écraser un autre rattachement concurrent.
Omettre le bloc conserve le lien. Choisir « Aucun rattachement » envoie `null`.
Changer mois/devise/type d’une opération liée exige un choix compatible ou une
dissociation explicite. Les opérations liées à un mois clôturé sont en lecture
seule. Le serveur applique aussi ces protections.

Si la lecture du suivi échoue, une saisie ordinaire sans rattachement reste
possible. Un changement de contexte d’une opération existante reste bloqué
jusqu’à vérification de son lien ; un PUT dans son contexte d’origine peut
conserver le lien en omettant le bloc. Aucun échec d’association n’entraîne une
création séparée suivie d’une deuxième tentative de rattachement.

Une protection par référence verrouille les doubles soumissions. Un succès
d’écriture reconnu reste un succès même si sa réponse ne peut pas être relue,
selon le mécanisme existant `acknowledgedWrite`.

## Accueil et analyse

Les deux pages utilisent `EnvelopeSection`, les mêmes cartes et le même contrat.
Choisir mois ou année, puis la devise. Chaque carte présente le prévu, le
réalisé rattaché, le disponible ou le dépassement, la progression non plafonnée
en texte et le nombre d’opérations. La barre est plafonnée visuellement à 100 %.
Un prévu nul reste affiché sans pourcentage artificiel.

La carte mensuelle montre jusqu’à trois paiements puis ouvre la liste complète.
La vue annuelle indique les seuls mois observés et permet d’ouvrir chaque mois.
Le dépassement net annuel et la somme des dépassements mensuels portent des
libellés distincts, car un mois sous budget peut compenser un autre mois.

Les listes d’enveloppes et de paiements sont paginées. Les filtres état/catégorie
et la recherche portent explicitement sur les éléments chargés, avec accès à
la suite. Aucun total global n’est calculé à partir d’une page incomplète.
Les détails conservent le mois sélectionné au retour et restaurent le focus.
Les détails d’une opération dans sa liste offrent un lien vers son enveloppe.

Dans les détails d’enveloppe :

- ajouter une dépense via le FAB commun, avec contexte prérempli ;
- associer une opération éligible sans rattachement, avec recherche/pagination ;
- dissocier sans supprimer la dépense ;
- modifier/réaffecter depuis le même formulaire partagé.

Les analyses affichent en plus les tendances par catégorie sur 3, 6 ou 12 mois
terminés : dépenses et budgets moyens, écart moyen signé, dépassement positif
moyen et fréquence de dépassement. L’échantillon et les exclusions sont visibles.
Un mois sans rattachement n’est pas un zéro confirmé ; un mois de catégorie
partiellement suivi est exclu par le serveur. Le mois courant/futur n’entre pas
dans ces moyennes. Aucun historique absent n’est reconstruit.

## Calculs et contrat

Le serveur fournit les métriques : les composants ne recalculent ni solde,
ni projection, ni moyenne. Alimentation 300/223 affiche 74,33 % et 77 € restants ;
300/333 affiche 111 % et 33 € de dépassement, jamais 633 € projetés.
300/400 représente 100 € supplémentaires dans le solde mensuel.

Pendant un mois ouvert, le prévu non consommé reste réservé. À la clôture, si
des paiements sont liés, leur réalisé remplace le prévu ; sans paiement lié,
le prévu est conservé. Le solde de synthèse, les reports et la capacité d’épargne
restent fournis par les moteurs backend. `reconciliationAdjustment`, lorsqu’il
est présent, est affiché comme **déjà inclus** dans le résultat, jamais ajouté
par le frontend. Réel, prévu et Simulation conservent leurs distinctions.

Routes préfixées `/v1`, authentification existante via `apiPrivate` :

| Usage                   | API                                                                                          |
| ----------------------- | -------------------------------------------------------------------------------------------- |
| Cartes                  | `GET /envelope-overview?month=YYYY-MM&currency=EUR` ou `year=YYYY`                           |
| Moyennes                | `GET /envelope-analytics?from=YYYY-MM&to=YYYY-MM&currency=EUR`                               |
| Choix du formulaire     | `GET /reconciliation/months/:month/occurrences?currency=EUR`                                 |
| Détail                  | `GET /reconciliation/occurrences/:id`                                                        |
| Paiements / candidats   | `GET /reconciliation/occurrences/:id/operations` avec `unassociated=true` pour les candidats |
| Lire / modifier le lien | `GET/PUT /operations/:id/reconciliation`                                                     |
| Saisie atomique         | `POST /operations`, `PUT /operations/:id`                                                    |
| Flag et versions        | POST/PUT existants `/operations-fixes/charges`, PUT `/operations-fixes/revenus/:id`          |
| Définitions datées      | `GET /operations-fixes/months/:month`                                                        |
| Archiver                | `DELETE /budget-envelopes/:id`                                                               |

Les parsers refusent les montants numériques, états ou métadonnées malformés et
les listes d’occurrences `TRACKING_ONLY`. Les curseurs opaques sont transmis sans
interprétation ; leur répétition est détectée. Les requêtes obsolètes sont
ignorées quand période/devise change ou qu’un composant est démonté.
Les mutations invalident les cartes et synthèses via la révision commune.

## Vérifications et limites

Les fixtures de `test/fixtures/envelopes.mjs` suivent les DTO du commit backend
référencé. Les tests couvrent leur parsing, les choix explicites/ambigus,
l’atomicité de la commande, la dissociation/réaffectation, les erreurs réseau et
de concurrence, les mois clôturés, le passage mensuel/annuel, les moyennes et les
modifications datées avec participation personnelle.

Les scénarios navigateur de `test/e2e/envelopes.spec.js` couvrent l’accueil,
l’analyse, le calendrier, l’édition depuis les opérations et les charges/revenus
fixes, aux largeurs 320/390/768/1440 dans les thèmes clair/sombre.
La recette sur Safari iPhone/PWA physique, VoiceOver et le parcours complet sur
les deux branches fusionnées restent à réaliser avant validation commune de #313.
Ces scénarios avec fixtures ne prétendent pas remplacer une recette du serveur
et de la base réels.

Aucune dépendance, variable de configuration, migration ou modification Expo.
Aucun workflow modifié ; pas de fusion, release ou déploiement automatique.
