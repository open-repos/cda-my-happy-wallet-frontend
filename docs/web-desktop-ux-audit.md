# Audit UX Web/PWA après 1.10.1 — 29 octobre 2026

Audit et propositions pour #326. Aucune refonte applicative appliquée. Le choix
du propriétaire entre **Atelier** et **Panorama** précède l’implémentation.

## Référence et périmètre

- Dépôt unique : `open-repos/cda-my-happy-wallet-frontend`, Web responsive/PWA.
- `AGENTS.md` lu ; aucun `WORK_ITEM_WORKFLOW.md` dans le checkout.
- Références actualisées avec `git fetch origin --prune`.
- `develop` : `038efcd171f5bea5f50bc628ecb4f90982fa1b10`.
- `main` : `de18c788c38e6c8e059f74bc424295da4b9ad976`.
- `git merge-base --is-ancestor origin/main HEAD` réussit ; comparaison
  `main...develop` : 0 commit propre à main, 1 à develop (fusion de synchronisation).
- `package.json` et lockfile : Web 1.10.1. PR #323 et #325 fusionnées ;
  synchronisation #322 fusionnée le 29 octobre à 10:37 UTC ; #324 fermé.
- PR ouvertes relevées : #288, #254, #231, #203 (application native) et #156
  (CI GitLab). Aucune ne doit être intégrée pour cet audit Web.
- Les deux captures fournies sont des indices de diagnostic privés. Aucune
  capture personnelle ni donnée de production n’est publiée.
- `mobile/`, backend, calculs, contrats API, workflows, déploiement et release
  exclus. Aucun merge autorisé.

## Inventaire des composants et styles

| Zone                          | Composants et logique actuels                                                                                                                                                                          | Styles et dépendances concernés                                                      |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| Coque/navigation              | `ProtectedLayout.jsx`, `SideBar.jsx`, `App.jsx`                                                                                                                                                        | `App.css`, styled-components dans `SideBar.jsx`, `design-tokens.css`                 |
| Prochains mois                | `pages/UpcomingMonths.jsx`, `Simulation/SimulationPanel.jsx`, `SimulationControls.jsx`, `PlanningActions.jsx`, `useBudgetForecast.js`, `usePotentialEvents.js`                                         | `MonthlyEvents.css`, `BudgetForecast.css`, `Simulation.css`, ECharts existant        |
| Ajout partagé                 | `QuickAdd/QuickAddProvider.jsx`, `QuickAddContext.js`, `useViewportBounds.js`                                                                                                                          | `QuickAdd.css`, `FormDialog.css`                                                     |
| Formulaires à préserver       | `Forms/FormDialog.jsx`, `FormHeader.jsx`, `FormActions.jsx`, `OneOffOperationForm.jsx`, `MonthlyEventForm.jsx`, `FixedChargeForm.jsx`, `FixedIncomeForm.jsx`, `FixedInlineEditor.jsx`                  | `ActionForms.css`, `ActionButton.css`, `CompactMoneyList.css`, `FixedOperations.css` |
| Accueil/enveloppes            | `Home.jsx`, `HomeComponents/CaseShowRaV.jsx`, `HomeBudget/*`, `Envelopes/EnvelopeSection.jsx`, `EnvelopeDetail.jsx`, `EnvelopeAssignment.jsx`                                                          | `Home.css`, `HomeBudget.css`, `Envelopes.css`                                        |
| Opérations/fixes/calendrier   | `ListeOperations.jsx`, `OperationsFixes.jsx`, `Calendrier.jsx`, `CompactOperations/*`, `OperationsFixes/FixedOperations.jsx`, `BudgetCalendar/*`                                                       | `Operations.css`, `FixedCharges.css`, `FixedOperations.css`, `BudgetCalendar.css`    |
| Objectifs/analyses/catégories | `Objectifs.jsx`, `Analyses.jsx`, `Categories.jsx`, `FinancialGoals/*`, `Analytics/*`                                                                                                                   | `FinancialGoals.css`, `Analyses.css`, `Categories.css`                               |
| Notifications                 | `App.jsx`, `LiveMessage.jsx`, `SimulationContext.jsx`, hooks `useOneOffOperations`, `useFixedCharges`, `useMonthlyEvents`, `useFinancialGoals`, `useCategories`, commandes locales de `EnvelopeDetail` | React Toastify 8.2 déjà installé, `LiveMessage.css`, messages par écran              |
| Écritures reconnues           | `utils/acknowledgedWrite.js`, services opérations/événements/enveloppes ; services objectifs/catégories à harmoniser                                                                                   | Aucun changement de contrat serveur nécessaire                                       |

## Observations, preuves et propositions

P1 : accès à une action, saisie ou compréhension du résultat ; P2 : efficacité
et cohérence. Les mesures ci-dessous portent sur le code courant et des fixtures
synthétiques, pas sur la production du propriétaire.

| Observation                                         | Cause vérifiée / niveau de preuve                                                                                                                                                                                                                       | Proposition                                                                                                                                                                      | Priorité |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| Contenu étroit sur grand écran                      | `max-width: 76rem` dans plusieurs panneaux. À 1920 px, panneau 1216 px, x = 402 px. La coque réserve 100 px à une navigation de 56 px.                                                                                                                  | Coque commune, navigation dimensionnée explicitement ; contenu fluide avec plafond proposé de 1600 px, padding 24–32 px.                                                         | P2       |
| Prévisions trop basses                              | `UpcomingMonths` place filtres, Simulation et `ForecastPlanning` avant le graphique. `monthly-events-page` ajoute un gap et `.simulation-surface` ses marges. Graphique mesuré à y ≈ 1040 px à 1440/1920 × 900, malgré des lectures réussies.           | Regrouper période/horizon/Simulation ; un bouton Ajouter ouvre les choix existants ; graphique avant détails secondaires.                                                        | P1       |
| Navigation apparemment tronquée                     | Reproduction Chromium : navigation x = 0, largeur 56 px. Les libellés ont volontairement une largeur nulle lorsqu’elle est repliée. Aucun décalage négatif reproduit. `Container` fixed sans ancrage `left/top` explicite reste fragile.                | Ancrage explicite ; icônes et libellés visibles sur grand écran ; tiroir aux faibles largeurs. Ne pas déclarer la capture « corrigée » sans reproduction équivalente.            | P1       |
| Certaines destinations difficiles à découvrir       | `SideBar` a six entrées. Prochains mois et charges/entrées fixes s’atteignent par des liens dans les pages. Les enveloppes sont des sections intégrées, pas une route indépendante.                                                                     | Exposer les pages existantes sans inventer de route Enveloppes ; accès contextuel aux sections d’enveloppes.                                                                     | P2       |
| Séparation faible des panneaux sombres              | Coque historique `--background` verte et surfaces `#343625`, ombre de carte discrète ; plusieurs panneaux n’utilisent pas la bordure sémantique disponible.                                                                                             | Utiliser les rôles canvas/surface/border/text existants ; bordure discrète et densité cohérente. Titres sur canvas avec texte primaire, titres sur coque avec texte sur coque.   | P2       |
| Grand bandeau inférieur mobile                      | Dock = ligne flex réelle, FAB 56 px + 24 px de padding + bordure : 81 px mesurés hors safe area ; contexte et ajout sont séparés.                                                                                                                       | Rail de 64 px hors safe area, sans grande surface blanche ; bouton unique « + Ajouter » de 48 px, ombre et séparation contrastée.                                                | P1       |
| « Ajout enregistré » reste au-dessus du bandeau     | `QuickAddProvider` conserve `feedback.text` dans un `LiveMessage` du flux, sans expiration.                                                                                                                                                             | Confirmation éphémère commune en haut du viewport ; supprimer la copie locale du succès.                                                                                         | P1       |
| Risque de confirmations multiples                   | QuickAdd appelle `SimulationContext.mutate`, qui renseigne son message, puis produit son propre feedback. `SimulationPanel` peut annoncer le même résultat sur les écrans où il est monté.                                                              | Un seul propriétaire de la confirmation par commande ; ni composant appelant ni effet de chargement ne la répète.                                                                | P1       |
| FAB peu détaché du fond                             | Le code possède déjà bordure, outline et `ds-shadow-overlay`. Il ne manque donc pas littéralement d’ombre ; sa perception dépend du fond/thème.                                                                                                         | Conserver tokens d’action, ajouter le libellé et un fond de rail cohérent ; vérifier contraste et ombre dans les deux thèmes. Focus à offset 0–2 px.                             | P2       |
| Champ mois d’enveloppe débordant dans la capture    | `Envelopes.css` a width 100 % et min-width 0 mais n’applique pas la normalisation native date/mois de `ActionForms.css`, limitée aux formulaires. Aucun dépassement du parent reproduit sous Chromium.                                                  | Étendre une règle partagée aux filtres natifs date/mois : border-box, min-inline-size 0, max-inline-size 100 %, rendu natif WebKit borné. Reproduction WebKit/iPhone nécessaire. | P1       |
| Calendrier à texte doublé                           | À 320/390 px, bouton « Mois suivant » mesuré hors écran (x ≈ 394 à 423 px), bien que le scrollWidth global soit borné par overflow-x hidden.                                                                                                            | Faire revenir l’en-tête et ses contrôles à la ligne ; tester les bornes des descendants et pas seulement le document.                                                            | P1       |
| Succès et échec de relecture inégalement distingués | Plusieurs hooks renvoient déjà true après écriture réussie/relecture échouée. Les fixes marquent ce résultat comme erreur ; Simulation invalide sans attendre les lectures. Les parseurs objectifs/catégories peuvent encore rejeter après HTTP réussi. | Résultat d’écriture séparé du résultat d’actualisation ; toast de résultat unique et action de lecture seule.                                                                    | P1       |
| Chargement visible dans la capture                  | La capture seule ne prouve pas de blocage. Les prévisions et potentiels arrivent avec les fixtures dans cet audit.                                                                                                                                      | Conserver loading/empty/error/retry ; ne modifier ni timeouts ni calculs sur la base de l’image.                                                                                 | P2       |

## Deux dispositions desktop

Les maquettes de conversation montrent les mêmes six mois fictifs, les mêmes
solde initial (1037,50 €), dépenses, objectifs et événement à confirmer. Les
bascules clair/sombre et Simulation sont locales aux maquettes. Elles ne
modifient aucune donnée de l’application. Les pictogrammes de production
continueront à utiliser la bibliothèque déjà présente.

### Atelier — recommandation

- Navigation latérale avec icônes et libellés ; largeur proposée 224 px sur
  grand écran. Même architecture pour accueil, opérations, fixes, calendrier,
  objectifs, analyses et catégories.
- En-tête court ; période, horizon, activation de Simulation et ajout regroupés
  dans une barre qui revient à la ligne si nécessaire.
- Détails des éléments potentiels dans un panneau dépliable ; la désactivation
  de Simulation ne supprime aucun élément potentiel.
- Graphique en pleine largeur, puis détail par mois. Les autres colonnes du
  tableau existant (report, disponibles jour/semaine/mois) restent accessibles ;
  leur présentation complète doit être conservée à l’implémentation.
- Méthode et explications repliables ; état et erreur visibles sans ouvrir un
  panneau. Un état d’échec conserve sa commande de reprise.
- Cible proposée : titre du graphique dans les 350 premiers pixels à 1440 ×
  900, texte normal ; aucune promesse « sans scroll » avec du texte à 200 %.

Atelier facilite le repérage entre de nombreuses pages et laisse davantage de
largeur aux listes, graphiques et enveloppes. Les paramètres rarement changés
ne prennent plus une section entière. C’est la meilleure base commune aux
écrans du produit, en gardant les composants existants.

### Panorama — alternative

- Navigation horizontale avec icônes et libellés ; passage au tiroir si les
  éléments ne tiennent pas, jamais d’onglet coupé.
- Période/horizon au-dessus ; graphique et tableau dans une colonne principale,
  Simulation et ajout dans un panneau latéral contextuel.
- Le panneau Simulation reste visible, utile pour comparer des hypothèses.
- En contrepartie, la navigation occupe plus de hauteur et le panneau réduit la
  largeur des données. À faible largeur ou avec texte agrandi, il doit passer
  sous les données principales ou devenir dépliable.

Dans les deux variantes : tableaux denses pour opérations/fixes, formulaire
d’ajout partagé, édition inline conservée ; calendrier prioritaire devant ses
détails ; objectifs et analyses en grilles adaptées ; cartes d’enveloppes plus
compactes et filtres en barre. Aucune modification des formules, agrégats,
devises, rattachements ou projections.

## Proposition d’ajout responsive

1. Conserver la ligne de layout qui réserve réellement l’espace sous le
   contenu. Réduire son chrome à un rail de 64 px + safe area basse, avec un
   seul bouton « + Ajouter », cible 48 px minimum. La réserve suit la hauteur
   réelle si le texte est agrandi ; ne jamais imposer 64 px au prix d’une coupe.
2. Garder `QuickAddContext.open`, la date sélectionnée du calendrier et les
   quatre choix Dépense/Entrée/Événement confirmé/À confirmer. La date et le
   contexte apparaissent dans le menu plutôt que dans un bandeau permanent.
3. Masquer le rail quand un formulaire, une édition inline ou la navigation
   mobile est ouvert. Inclure les cas saisie fixe, objectif, catégorie,
   calendrier et enveloppe ; éviter une liste de sélecteurs CSS incomplète.
4. Suivre `VisualViewport` pour le clavier, y compris paysage avec largeur
   supérieure à 767 px. Ne pas limiter la logique au breakpoint téléphone.
   Réserver safe areas gauche/droite/basse via env(), plus les bornes du viewport.
5. Conserver le portail `FormDialog`, inertie du fond, focus contenu, fermeture
   bloquée en mutation, défilement interne et restauration de focus. Aucun
   remplacement des formulaires ou de leur gestion de brouillon.
6. Notifications en haut, ajout en bas. Une popup ne doit pas être recouverte
   par un toast interactif ; le résultat réussi est publié après fermeture de
   la popup, ou différé jusqu’à une zone non obstructive. Une autre popup déjà
   ouverte diffère la présentation sans rejouer la mutation.

Le passage des 81 px actuels au rail de 64 px économise environ 17 px hors safe
area ; le gain supplémentaire vient de la suppression du feedback persistant
et du grand fond de bandeau, pas d’une réduction des cibles tactiles.

## Contrat commun des notifications à implémenter

### Propriétaire, point d’entrée et dédoublonnage

Un adaptateur partagé `useMutationFeedback` / service `mutationFeedback`
(noms proposés) orchestre le résultat de la commande. Les hooks métier lui
fournissent l’écriture, les lectures à actualiser et les libellés ; les services
HTTP restent indépendants de Toastify. Les composants affichent les erreurs
locales et ne déclenchent pas de toast de succès.

- Un `ToastContainer` existe déjà dans `App.jsx`, top-right, autoClose 5000.
  Le conserver unique, dans une couche de notification qui n’est pas rendue
  inerte par le portail d’une popup ; aucune nouvelle bibliothèque.
- Un identifiant de commande unique par action utilisateur, créé avant
  l’écriture, partagé entre QuickAdd, Simulation et le hook concerné. Utiliser
  cet identifiant comme `toastId`, sans dédoublonner toutes les modifications
  successives d’une même entité. Garder les identifiants en mémoire seulement.
- Une seule couche émet le résultat final. Pas de toast sur rendu,
  `useEffect` observant `status`, simple GET, pagination, retour de focus,
  changement de période/thème, invalidation ou retry de lecture.
- Garder les verrous d’écriture/double clic existants. Le dédoublonnage des
  notifications ne remplace pas ces verrous.
- Conserver les signatures publiques actuelles des hooks (booléen ou `{ ok,
code }`) via adaptation interne ; ne pas casser les formulaires pour ajouter
  une nouvelle forme de résultat.

### États indépendants

| Écriture                   | Actualisation                | Résultat utilisateur et reprise                                                                                                |
| -------------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| En attente                 | Non lancée                   | Bouton occupé ; aucun succès.                                                                                                  |
| Refus explicite du serveur | Sans objet                   | Erreur dans le formulaire, champ ou confirmation destructive ; brouillon conservé ; aucun succès.                              |
| Réponse de succès reconnue | Réussie                      | Une confirmation française après la commande.                                                                                  |
| Réponse de succès reconnue | Échouée ou réponse illisible | « Opération ajoutée. Les données n’ont pas pu être actualisées. » + « Recharger les données ». L’écriture ne se rejoue jamais. |
| Résultat réseau inconnu    | Inconnu                      | Ne pas affirmer un refus ni un succès certain ; demander de vérifier/actualiser avant une nouvelle écriture.                   |

Étendre la frontière `AcknowledgedWriteError` aux services qui parsèrent une
réponse après un HTTP réussi (notamment objectifs/catégories), sans changer
les payloads. Une lecture obsolète ou annulée n’est pas un refus d’écriture.
Pour Simulation/QuickAdd, la révision d’invalidation ne suffit pas à prouver une
actualisation : attendre ou corréler le résultat des lectures pertinentes à la
commande d’origine. Les lecteurs passifs ne déclenchent pas chacun un toast.

Attendre le résultat d’actualisation avant d’émettre le message final, pour ne
pas annoncer un succès puis un second message sur la même mutation. Si une
actualisation est durablement en retard, garder la confirmation d’écriture et
présenter une reprise explicite de lecture sans effacer l’état reconnu.

### Libellés et accessibilité

- « Opération ajoutée. », « Opération modifiée. », « Opération supprimée. »
- « Charge ajoutée/modifiée/supprimée. » ; « Entrée fixe ajoutée/modifiée/supprimée. »
- « Événement ajouté/modifié/supprimé. » ; garder la précision confirmé ou
  Simulation quand elle change l’interprétation du résultat.
- « Objectif ajouté/modifié/supprimé. », « Catégorie ajoutée/modifiée/supprimée. »
- « Dépense associée à l’enveloppe. » / « Dépense dissociée de l’enveloppe. »
- Conserver une précision de mois d’effet pour les modifications fixes futures.
- `LiveMessage` reste utilisé pour loading, erreurs locales, tri et aides.
  Retirer seulement les copies des succès migrés vers Toastify.
- Pour une confirmation, une annonce `role="status"`, polie. Toastify possède
  son propre mécanisme live : ne pas doubler avec une région live externe.
  Ne pas appliquer aveuglément ce rôle aux erreurs d’authentification existantes.
- Un échec de relecture après succès est une information de récupération,
  jamais « l’enregistrement a échoué ». L’action Recharger reste disponible
  dans la page même après fermeture du toast ; pas de temporisation pour ce
  toast tant que son action est la seule reprise.
- Ne pas déplacer le focus vers le toast. Fermeture et rechargement accessibles
  au clavier ; cibles tactiles d’au moins 44 px, texte à 200 % lisible.
- Position proposée : top-right desktop, top-center téléphone ; largeur max
  bornée au viewport, safe areas et thèmes via tokens existants. Limiter les
  toasts simultanés pour ne pas masquer la page ; file d’attente sans perte.
- L’action Recharger utilise les paramètres actuels de la vue et uniquement
  des GET ; invalider les callbacks périmés après navigation/démontage. Une
  nouvelle lecture échouée peut actualiser le même état de récupération sans
  nouvelle confirmation d’écriture.

## Validation réalisée et limites

### Référence applicative inchangée

`npm ci`, format, lint, `test:api-response`, `test:api-thunk`, `test:rav`,
`test:refresh-token`, `test:release`, type-check, `npm test` (**663 tests dans
105 fichiers**) et build : réussis sur la référence auditée. Aucun changement
applicatif ou de dépendance ajouté à cette unité documentaire.

**32 parcours Chromium ciblés réussis** : `formDialogs.spec.js` (8),
`fixedInlineEditing.spec.js` (2), `compactOperations.spec.js` (10),
`webRefreshAnnouncements.spec.js` (12). Ils couvrent les popups fixes et
opérations, les brouillons et transitions de clavier simulé, l’édition inline,
la date sélectionnée du calendrier, la reprise GET seule après succès
d’écriture, et le silence des annonces de chargement après mutation. Les
notifications communes proposées ne sont pas encore implémentées/testées.

### Audit navigateur

- Chromium headless **153.0.8010.0**, via Playwright 1.61.1 ; moteur local
  alternatif car le téléchargement du Chromium attendu par Playwright a
  échoué. Configuration temporaire hors dépôt ; aucun workflow modifié.
- 192 mesures : 8 pages × 6 largeurs (320, 390, 768, 1024, 1440, 1920) ×
  2 thèmes × 2 tailles de texte. API interceptée avec les fixtures du dépôt,
  aucun compte ou backend réel. Les mesures ne sont pas 192 tests fonctionnels.
- Texte doublé en multipliant les tailles calculées des éléments par deux ;
  cette contrainte détecte le défaut du calendrier. Elle ne simule ni le zoom
  navigateur complet ni les réglages d’accessibilité iOS.
- Aucun contrôle hors écran à texte normal dans ces mesures ; quatre mesures
  problématiques à texte doublé (calendrier 320/390, deux thèmes). Le document
  masque le débordement horizontal : ce contrôle seul serait insuffisant.
- Contrôles mois/devise d’enveloppes dans leur parent sous Chromium aux six
  largeurs et deux tailles ; ne conclut pas sur Safari natif.
- Maquettes : 30 vérifications locales (deux variantes, six largeurs, deux
  thèmes ; proposition mobile à 320/390/768 dans les deux thèmes), aucune
  erreur JavaScript ni overflow du document. Activation de Simulation,
  ouverture d’ajout, notification et masquage avec clavier simulé vérifiés.

WebKit 26.5 a été téléchargé, mais ses bibliothèques système manquent dans ce
runtime ; leur installation échoue. **Aucune nouvelle validation WebKit réussie
revendiquée pour cet audit.** Les preuves WebKit antérieures de #323 ne sont pas
une nouvelle exécution de cette mission. Safari/PWA sur iPhone physique n’est
pas disponible et reste une recette séparée (#54).

### Plan de recette après choix et implémentation

- Rejouer les commandes `AGENTS.md` sur chaque changement et les parcours
  existants `formDialogs`, édition inline, opérations compactes et annonces.
- Chromium et WebKit aux six largeurs, clair/sombre, texte à 200 %, plus
  paysage 844 × 390 et zoom navigateur ; inspecter les bornes des descendants.
- Navigation clavier complète, focus discret, ordre logique, fermeture Échap,
  restauration du déclencheur et visibilité des contrôles.
- Brouillons Charge/Entrée, validation de champs, radio Dépense/Entrée,
  réouverture popup, fermeture interdite pendant mutation, erreurs et reprise.
- Création/modification/suppression sur opérations, fixes, événements,
  objectifs, catégories ; association/dissociation d’enveloppe ; une seule
  annonce finale par commande, y compris QuickAdd sur calendrier/prévisions.
- Échec POST/PUT/DELETE explicite ; succès HTTP suivi de parsing/relecture
  échoués ; reprise GET seule ; double clic ; réponses obsolètes ; démontage
  pendant requête ; changement de filtre/thème ; aucune notification au GET.
- Clavier simulé via VisualViewport, safe areas simulées, toast long et file
  d’attente ; preuves distinctes de la recette Safari et PWA standalone sur
  iPhone physique, clavier réel, rotation, zoom et VoiceOver.

## Découpage de la suite

Après choix explicite du propriétaire : unités ciblées pour (1) coque et
desktop, (2) rail/filtres responsive et calendrier, (3) contrat de notifications
et migration des émetteurs. PR vers develop, revue propriétaire, aucune fusion
automatique. Chaque changement visible recevra son fragment avec `user:` en
français. **Aucun fragment de changement utilisateur pour cet audit seul**,
conformément à `changes/README.md` : le comportement livré n’a pas changé.

Les maquettes sont des propositions de revue dans la conversation ; elles ne
sont ni importées par le bundle, ni déployées. Ne pas y ajouter de données ou
captures personnelles pour la recette publique.
