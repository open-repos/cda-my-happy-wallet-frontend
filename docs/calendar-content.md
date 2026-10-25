# Contenu exhaustif du calendrier — #293 / #294

Dépendance : backend 1.7.0, contrat #134 fusionné par #136 et publié par #137.
Déployer le backend avant le frontend. Un backend plus ancien produit un état
indisponible explicite et une reprise de lecture, jamais un faux jour vide.

## Sources et correspondance

Toutes les pages des opérations bornées au mois (sans filtre de devise), des
occurrences `month&scenario=simulation` et des décisions `from&to` sont lues.
La synthèse conserve son scénario standard/simulation et ses montants serveur.
Le paramètre simulation de la lecture des occurrences permet seulement de voir
les potentiels ; il ne change pas l'inclusion dans les calculs ni le solde réel.
Les marqueurs et le détail utilisent la même projection complète du même mois.
Les réponses tardives d'un ancien mois sont ignorées ; le jour se filtre
localement sans effacer les autres marqueurs du mois.

| Modèle serveur                                    | Présentation                                                                      |
| ------------------------------------------------- | --------------------------------------------------------------------------------- |
| Opération DEPENSE / ENTREE                        | Mouvement réel à operationDate, catégorie avec son icône                          |
| Règle CONFIRME non résolue                        | Événement prévu, confirmé ; jamais une opération réelle                           |
| Règle POTENTIEL                                   | Potentiel à confirmer, visible même en standard, exclu du réel                    |
| CONFIRME daté avant aujourd'hui Paris, non résolu | Prévu et en retard simultanément                                                  |
| Décision REALIZED avec opération                  | Mouvement unique par operation.id, lien vers l'occurrence                         |
| REALIZED avec opération déplacée                  | Mouvement à sa date réelle ; référence non financière sur le jour de l'occurrence |
| REALIZED sans opération                           | Occurrence réalisée, opération supprimée ; aucun mouvement réel artificiel        |
| CANCELED                                          | Occurrence annulée, aucun mouvement réel                                          |

La clé d'une occurrence récurrente est eventId + occurrenceDate. Une décision
masque l'occurrence prévue correspondante, sans rapprochement par titre ou
montant. Le GET des décisions inclut aussi celles dont l'opération actuelle est
dans la période : le lien subsiste lors d'une conversion entre deux mois. Une
règle supprimée ne supprime pas son instantané de décision. L'expiration des
potentiels reste entièrement décidée par le backend ; aucun historique inventé.
Les règles d'événement n'ont pas de catégorie dans le contrat actuel.

## Architecture et interactions

Projection pure séparée des services paginés, hooks gardés par leur clé de
requête et composants de présentation. Marqueurs et légende partagent les mêmes
formes/libellés ; plusieurs types peuvent apparaître. Les modes de montant
restent ceux de la synthèse. Aucun total n'est calculé depuis la projection.
Le détail commun affiche tous les éléments, dans un ordre stable par date,
nature, titre puis identité. Le filtre des opérations existant démarre sur Tout
et indique clairement sa portée ; les autres natures restent visibles.
L'éditeur inline, les formulaires et commandes de conversion existants sont
réutilisés. Les écritures acquittées restent réussies si une relecture échoue ;
Réessayer ne fait que des GET. L'invalidation conserve le mois et le jour.

## Preuves et limites

Tests unitaires de projection, pagination >100, liens déplacés/supprimés,
récurrence, mois tardifs, erreur et relecture après mutation. Scénario navigateur
mixte avec 122 opérations sur deux pages, confirmé, potentiel et retard aux
320/390/768/1440, clair/sombre, texte 200 %, activation clavier et futur sans
synthèse. Les captures générées utilisent uniquement des données synthétiques.
La CI couvre les références canoniques et les autres parcours du dépôt.
Chromium local/CI et export Expo Web ne constituent pas une recette Safari,
iPhone/VoiceOver ou appareil Android/TalkBack ; ces appareils sont indisponibles.
