# Enveloppes budgétaires (#384, #389)

Équivalent mobile de la consultation Web des enveloppes (#313, #314 ;
[`docs/web-budget-envelopes.md`](../../docs/web-budget-envelopes.md)). Le
mobile affiche, sans rien modifier, les charges mensuelles marquées comme
enveloppes et leurs dépenses rattachées. Déclarer une enveloppe, rattacher ou
détacher une dépense est possible depuis #389 (section « Écritures »).

## Écrans

- **Accueil, « Mes enveloppes »** : enveloppes du mois courant (Europe/Paris),
  en euros. Chaque carte montre le dépensé sur le prévu, une jauge plafonnée à
  100 %, le pourcentage réel non plafonné, l'état écrit (« ✓ 77,00 €
  disponibles », « ✓ Budget atteint », « ⚠ Dépassement de 33,00 € »), le
  nombre d'opérations et jusqu'à trois paiements. « Voir les dépenses (n) »
  ouvre le détail. La liste est paginée (« Afficher la suite des
  enveloppes »).
- **Détail** (`/envelope?enveloppe=<id>&occurrence=<id>`) : indicateurs du
  mois, mention « Mois clôturé » en lecture seule, dépenses rattachées
  paginées, puis statistiques de l'année de l'occurrence.

## Contrat

Routes préfixées `/v1`, mêmes parseurs que le Web
(`src/features/envelopes/domain/budgetEnvelope.ts`) : montants en chaîne,
états connus, aperçu de trois paiements au plus, occurrences `ENVELOPE`
seulement.

| Usage        | API                                                                   |
| ------------ | --------------------------------------------------------------------- |
| Cartes       | `GET /envelope-overview?month=YYYY-MM&currency=EUR&limit=20`          |
| Détail       | `GET /reconciliation/occurrences/:id`                                 |
| Dépenses     | `GET /reconciliation/occurrences/:id/operations?unassociated=false`   |
| Statistiques | `GET /envelope-overview?year=YYYY&currency=EUR`, ligne de l'enveloppe |

Le serveur calcule toutes les métriques et moyennes ; le mobile ne fait que
les formater. Les statistiques reprennent celles de la vue annuelle du Web
(dépense et budget moyens, écart signé, dépassement positif moyen, fréquence
et échantillon). Leur ligne est cherchée par l'identifiant de l'enveloppe
transmis par la carte, page après page ; un curseur répété arrête la
lecture. Le `sourceId` d'une occurrence n'est pas utilisé pour cela : il peut
désigner l'enveloppe archivable plutôt que la charge fixe.

## Accessibilité

- État de dépassement toujours écrit, avec symbole, en plus de la couleur.
- Jauge `progressbar` « Budget consommé » : valeur plafonnée à 100, texte du
  pourcentage réel.
- Chargement, vide et erreur via `FeedbackState`, chacun avec « Réessayer ».
- Ouverture du détail annoncée (titre, mois, état) ; la suite d'une liste
  annonce le nombre d'éléments chargés.
- Boutons d'au moins 48 dp.

## Vérification

- Tests unitaires : `budgetEnvelope.test.ts`, `HttpEnvelopesGateway.test.ts`.
- Playwright : `test/visual/envelopes.spec.ts` (accueil, détail, erreur et
  relance, mois vide) sur les données de `scripts/serve-export.mjs`.
- Recette Android (grandes polices, TalkBack) regroupée en fin de parité.

## Écritures (#389)

### Déclarer une enveloppe

Dans « Modifier le budget fixe », une charge propose « Utiliser comme
enveloppe budgétaire mensuelle ». La case n'est active que pour une charge
mensuelle (périodicité absente = mensuelle, défaut du backend) ; sinon elle
reste désactivée avec l'explication du Web. Le mobile ne modifie pas la
périodicité : la passer à une autre valeur (ce qui décoche l'enveloppe) se fait
sur le Web. Une entrée ne propose jamais l'enveloppe.

En modification, « Appliquer la modification à partir de » choisit le mois
courant ou l'un des 23 suivants (boutons « Mois précédent » / « Mois
suivant »). Le `PUT` reste partiel : `isBudgetEnvelope` n'est envoyé que s'il
change, `effectiveMonth` seulement pour un mois postérieur au mois courant.

### Rattacher une dépense

Le formulaire d'opération (liste, calendrier, ajout rapide) affiche
« Rattacher à une enveloppe » pour une dépense, ou pour une opération déjà
liée. Les choix sont les enveloppes ouvertes du mois et de la devise de la
dépense (`GET /reconciliation/months/:month/occurrences`, mode intégré
seulement) ; « Aucun rattachement » reste le choix initial. En modification,
le lien actuel est relu (`GET /operations/:id/reconciliation`). Une suggestion
d'après la catégorie demande toujours un clic « Choisir… ».

Le bloc `reconciliation { occurrenceId, expectedOccurrenceId }` part dans le
même `POST`/`PUT` que l'opération, seulement après un choix explicite ;
l'omettre conserve le lien, « Aucun rattachement » envoie `null`. Les
protections du Web s'appliquent avant l'envoi : mois clôturé en lecture seule,
lien non vérifié quand le mois, la devise ou le type change, choix
incompatible, enveloppes non chargées.

Les refus du serveur (`PERIOD_CLOSED`, `ASSOCIATION_CONFLICT`,
`INVALID_BUDGET_ENVELOPE`, `ENVELOPE_IN_USE`…) affichent les messages du Web ;
le brouillon reste ouvert.

### Rafraîchissement

Toute écriture d'opération ou du budget fixe incrémente la révision de la
Simulation : l'accueil (synthèse, enveloppes), le calendrier et les autres
lectures abonnées se relisent sans bruit.

### Vérification

`fixedBudget.test.ts`, `envelopeAssignment.test.ts`,
`HttpEnvelopesGateway.test.ts` ; Playwright `test/visual/envelope-writes.spec.ts`
(drapeau et mois d'effet, rattachement depuis une suggestion, refus
`PERIOD_CLOSED`). Recette Android regroupée en fin de parité.
