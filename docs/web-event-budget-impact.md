# Impact sur le budget : diagnostic Web après v1.8.0

Relevé du 27 octobre 2026. Branche issue de `origin/develop` à `e40de92`.
Le fichier du formulaire est identique dans cette base et dans `v1.8.0`.

## Reproduction et limites

Le formulaire isolé alterne correctement Dépense → Entrée → Dépense sous
Vitest/jsdom et Chromium avec toucher simulé. Cela ne reproduit donc pas, à
lui seul, le blocage précis rapporté sur iPhone Safari/PWA.

Un défaut reproductible existe lorsque deux instances coexistent : ouvrir
Ajouter un événement sur Objectifs et événements, puis ouvrir un événement
à confirmer depuis le FAB. Le premier formulaire reste monté derrière le
dialogue. Chaque instance utilisait les mêmes `id`, dont
`monthly-event-expense` et `monthly-event-income`. Le `htmlFor` du second
libellé cible alors le premier contrôle du document. Le même défaut affecte
les champs, le titre de région et les descriptions d'erreur. Un toucher
direct sur le radio et un toucher sur son libellé peuvent donc diverger.

Le test à deux instances échoue sur la version initiale et passe après la
correction. Ce défaut est démontré ; son rôle dans la capture iPhone à
formulaire unique n'est pas établi. Ne pas déclarer la recette Safari terminée.

## État, événements et styles examinés

- `MonthlyEventForm` est contrôlé : `checked` dépend de `values.kind`, les
  deux valeurs sont `DEPENSE` et `ENTREE`, `onChange` fusionne le seul champ
  modifié avec le brouillon précédent.
- Le parent ne réécrit pas le champ à chaque rendu. L'initialisation est dans
  `useState`, aucun effet ne synchronise `event` vers le brouillon. Les clés
  des parents dépendent de l'événement ou du contexte d'ouverture, pas du sens.
- `useFormFocus` traite le montage/démontage. L'effet clavier traite Échap ;
  aucun `preventDefault` n'intercepte les changements radio.
- Le backdrop est frère de la surface positionnée du dialogue ; aucune
  superposition interceptant le radio n'a été reproduite sous Chromium.
- La règle générale `.monthly-event-form input` inclut les radios ; Chromium
  calcule néanmoins une taille de 20 px et un padding natif nul. Cela ne
  démontre pas une interception CSS sous Safari. Aucun correctif CSS spéculatif
  n'est ajouté dans cette PR.

## Correction minimale

`useId` fournit une identité stable par instance. Tous les champs, libellés,
titre et erreurs sont liés à cette identité. `name`, valeurs radio, état,
payload et règles financières sont conservés. Aucun remount ni reset du
brouillon n'est ajouté. Aucun backend ou changement visuel nécessaire.

## Vérification

- `monthlyEventForm.test.jsx` : deux formulaires indépendants, alternances
  répétées, titre/montant/date préservés, édition initiale entrée ou dépense,
  récurrence/date de fin et rerender parent sans perte de saisie.
- `eventBudgetImpact.spec.js` : ajouts prévu/potentiel, édition, valeur du
  payload, clavier fléché et labels à 320/390/768/1440 px, clair/sombre ;
  coexistence du formulaire de page et de l'ajout rapide.
- API simulée dans les tests navigateur : aucune écriture sur la production.
- Les commandes Web d'AGENTS.md restent requises ; voir le bilan de la PR.

## Recette restante sur appareil

Sur iPhone Safari puis PWA installée : tester chaque entrée (calendrier,
Objectifs, FAB), prévu/potentiel, ajout/édition ; taper le cercle puis le texte
du choix ; faire cinq allers-retours ; conserver un titre, montant, récurrence
et date de fin ; enregistrer puis rouvrir pour confirmer le sens sauvegardé.
Recommencer avec clavier affiché et avec un autre formulaire derrière le FAB.
Noter version iOS et marqueur du build. Si le blocage subsiste avec une seule
instance, poursuivre le diagnostic Safari ; les tests Chromium ne l'excluent pas.

Retour arrière : revert de cette PR, sans migration ni changement de configuration.
