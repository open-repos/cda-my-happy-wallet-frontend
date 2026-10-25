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

Travail en cours, aucune recette navigateur ni appareil annoncée.
25 tests ciblés réussis : sélecteur, budget fixe, opérations et ajout rapide.
Les 581 tests Web globaux passent ; npm ci, format, lint, test:api-response,
test:api-thunk, test:rav, test:refresh-token, test:release, type-check et build
sont exécutés avec succès. Le format des nouveaux fichiers est contrôlé aussi
explicitement avec Prettier, car le script historique liste ses chemins.
Tests historiques adaptés pour utiliser la liste et les options réellement
visibles. Avant finalisation : ajouter et exécuter les parcours navigateur de
placement/clavier/focus dans le formulaire d'ajout, nombreux choix, scroll
sélectionné, catégorie personnelle, fallback, nom long, thèmes, 320/390/768/1440
et texte agrandi. Captures avant/après ordinateur/téléphone encore à produire.
Safari/WebKit, iPhone/VoiceOver et intégration backend encore à recetter.
Ne pas assouplir les captures ou seuils existants. Le natif est indépendant dans #291.

## Calendrier : dépendance distincte

#292 regroupe #293 Web et #294 natif, bloqués sur le contrat de lecture proposé
dans open-repos/cda-my-happy-wallet-backend#134. Les occurrences théoriques ne
portent ni résolution ni lien vers l'opération ; seul le résultat POST de
conversion fournit ces informations. Ne pas rapprocher par titre/montant/date :
ils peuvent changer à la conversion. Le contrat backend doit être fusionné
avant son utilisation, selon AGENTS.md. Aucune donnée de calendrier ni formule
financière n'est modifiée par #290.
