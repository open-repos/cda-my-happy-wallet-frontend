# Sélecteurs de catégorie avec icônes — reprise #290

## Architecture

`Fields/ChoiceSelect` est la primitive de sélection générique : options
`{value, label}`, rendu injecté par `renderOption`, navigation clavier,
placement et focus. Elle ne connaît ni API, ni catégorie, ni règles de budget.
`Categories/CategorySelect` adapte les catégories existantes et conserve
l'API `onChange({target: {name, value}})` des formulaires. Le rendu est celui de
`CategoryLabel`/`CategoryMark`, avec le fallback existant. Aucune dépendance.

Consommateurs migrés : `OneOffOperationForm`, `OneOffInlineEditor`,
`RealizeOccurrenceForm`, `FixedCategorySelect` (création et édition des charges
et entrées fixes). L'ajout depuis le calendrier et le bouton flottant réutilise
`OneOffOperationForm`. `MonthlyEventForm` n'a pas de champ catégorie : le
contrat `MonthlyEvent` ne contient pas `categoryId`. Ne pas en inventer.

Le menu est rendu dans le DOM du formulaire parent pour rester dans son
périmètre de focus, avec placement fixed borné au viewport visuel, défilement
interne et recalage au scroll/resize. Focus sur le déclencheur, option active
par aria-activedescendant ; flèches, Home/End, recherche par frappe, Entrée/Espace,
Échap et Tab. Échap est consommé avant le formulaire parent ; une sélection
n'est jamais une soumission. Le champ masqué conserve name/form/value. Une
sélection absente du catalogue reste visible sans être remplacée implicitement.

## État de reprise

Travail en cours, recette appareil non effectuée.
25 tests ciblés réussis : sélecteur, budget fixe, opérations et ajout rapide.
Après synchronisation avec les développements de Web 1.7.0, les 611 tests Web globaux passent ; npm ci, format, lint, test:api-response,
test:api-thunk, test:rav, test:refresh-token, test:release, type-check et build
sont exécutés avec succès. Le format des nouveaux fichiers est contrôlé aussi
explicitement avec Prettier, car le script historique liste ses chemins.
Tests historiques adaptés pour utiliser la liste et les options réellement
visibles. Après synchronisation, 35 parcours navigateur passent avec Chromium
149 local : catégories fixes, opérations compactes et ajout rapide, comparaison
d’épargne et annonces après actualisation. Les parcours d’épargne/opérations
couvrent 320/390/768/1440, clair/sombre et texte agrandi. La suite MySQL/Redis
reste à exécuter en CI : Docker et les services ne sont pas disponibles localement.
Avant finalisation : compléter les parcours spécifiques au sélecteur pour
placement/clavier/focus dans le formulaire d'ajout, nombreux choix, scroll
sélectionné, catégorie personnelle, fallback, nom long, thèmes, 320/390/768/1440
et texte agrandi. Captures avant/après ordinateur/téléphone encore à produire.
Safari/WebKit, iPhone/VoiceOver et intégration backend encore à recetter.
Aucune nouvelle capture de référence ni tolérance modifiée.
Ne pas assouplir les captures ou seuils existants. Le natif est indépendant dans #291.

## Calendrier : dépendance distincte

#292 regroupe #293 Web et #294 natif, bloqués sur le contrat de lecture proposé
dans open-repos/cda-my-happy-wallet-backend#134. Les occurrences théoriques ne
portent ni résolution ni lien vers l'opération ; seul le résultat POST de
conversion fournit ces informations. Ne pas rapprocher par titre/montant/date :
ils peuvent changer à la conversion. Le contrat backend doit être fusionné
avant son utilisation, selon AGENTS.md. Aucune donnée de calendrier ni formule
financière n'est modifiée par #290.

## Compatibilité avec les releases en préparation

Audit du 25 octobre 2026 : backend **1.6.0** en PR #133 (code fonctionnel
`df135c2` déjà fusionné dans develop) ; Web **1.7.0** en PR #299 (code
fonctionnel `e5b9f05`, après fusion de #289 dans develop). Les PR de release
sont ouvertes à ce relevé ; leurs modifications propres sont les versions et
notes, pas de nouveaux contrats ni de composants supplémentaires. La PR #298
est indépendante : elle ne fait pas partie du contenu préparé de Web 1.7.0.
Ne pas modifier les branches de release pour la synchroniser.

La branche de #298 reprend les développements de `origin/develop` après #289 :
comparaison d'épargne, hooks/services et rendu EChart existants, fixtures et
références canoniques déjà revues. Le conflit d'ajout en fin de
`test/full-stack/journeys/wallet.spec.js` est résolu en gardant à la fois le
helper de sélection par option et le nouveau parcours de trajectoires.
L'assertion de catégorie après rechargement vérifie le nom affiché ET la valeur
`categoryId` du champ de formulaire ; elle ne suppose plus un select natif.
Le choix Personnel est ciblé dans le listbox avec correspondance exacte, pour
ne pas être confondu avec les options Personnel / mois du tri du budget fixe.

Le backend ajoute `POST /v1/savings-capacity/trajectories` en lecture sous
hypothèses. Les GET opérations/catégories/événements/occurrences et les statuts
restent inchangés. Les couleurs et identifiants d'icônes existants restent donc
compatibles, aucun adaptateur API supplémentaire n'est nécessaire au sélecteur.
La projection d'épargne utilise des hypothèses locales, sans écriture financière ;
ne pas inclure ses POST dans un compteur d'écritures métier. Les sélecteurs
textuels d'objectif/horizon et les graphiques partagés ne sont pas remplacés par
le sélecteur de catégorie. Aucun calcul d'épargne ni formule de budget modifié.
La stack d'intégration mise à jour en #289 pointe sur le backend `df135c2` :
conserver cette référence et le parcours d'épargne déjà intégré.

#134 reste un contrat proposé non implémenté : backend 1.6.0 ne fournit toujours
pas de GET des résolutions et liens vers opérations. #293/#294 restent bloqués
sur cette dépendance. La PR native #288 est encore indépendante et non fusionnée
au relevé ; elle n'est pas annoncée comme livrée par Web 1.7.0. #291/#297 doivent
revérifier son état avant de commencer leur branche.
