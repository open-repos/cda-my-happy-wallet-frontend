# Enveloppes budgétaires en lecture (#384)

Équivalent mobile de la consultation Web des enveloppes (#313, #314 ;
[`docs/web-budget-envelopes.md`](../../docs/web-budget-envelopes.md)). Le
mobile affiche, sans rien modifier, les charges mensuelles marquées comme
enveloppes et leurs dépenses rattachées. Déclarer une enveloppe, rattacher ou
détacher une dépense reste sur le Web en attendant #389.

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
