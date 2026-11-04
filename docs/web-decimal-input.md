# Saisie décimale Web

Tous les champs de montant et de pourcentage passent par
`src/js/utils/decimalInput.js`. La saisie est convertie en centièmes entiers,
sans arrondi flottant, puis envoyée à l'API au point (`12,5` devient `"12.50"`)
ou en nombre, selon le contrat existant de chaque ressource.

## Règles

- Séparateur décimal : virgule ou point, une seule fois.
- Deux décimales au plus ; `12,` et `,50` sont refusés.
- Espaces de groupement acceptés entre groupes de trois chiffres (espace,
  insécable, fine insécable) : `1 200,50`.
- Refusés : plusieurs séparateurs (`12,5,0`, `1.200,50`), lettres, notation
  scientifique, `+`, et `-` hors champ signé (aucun champ actuel n'est signé).
- Borne haute : 99 999 999,99, soit le `Decimal(10, 2)` du backend.
- Une saisie refusée n'est jamais enregistrée : le champ passe en
  `aria-invalid` et son message d'erreur lui est lié.
- Chaque champ décimal est un champ texte avec `inputMode="decimal"`, pour
  afficher un clavier avec séparateur sur mobile.

## Inventaire (novembre 2026, #357)

| Champ                                                                      | Avant, desktop                                           | Avant, mobile (clavier décimal français)        | Après, partout                                                       |
| -------------------------------------------------------------------------- | -------------------------------------------------------- | ----------------------------------------------- | -------------------------------------------------------------------- |
| Opération ponctuelle : formulaire et éditeur en ligne                      | point seul ; virgule refusée                             | clavier avec virgule, saisie refusée : bloquant | virgule ou point                                                     |
| Événement prévu (calendrier, objectifs et événements)                      | point seul ; virgule refusée                             | clavier avec virgule, saisie refusée : bloquant | virgule ou point                                                     |
| Réalisation d'une échéance                                                 | point seul ; virgule refusée                             | clavier avec virgule, saisie refusée : bloquant | virgule ou point                                                     |
| Objectif : cible, déjà épargné, versement mensuel                          | première virgule seulement ; `1 200,50` refusé           | identique au desktop                            | règles partagées                                                     |
| Simulation de trajectoire d'épargne                                        | virgule ou point ; `12,` accepté comme `12.00`           | identique au desktop                            | règles partagées ; `12,` refusé ; 13 caractères pour `12 000 000,00` |
| Charge fixe : montant et part personnelle (formulaire et éditeur en ligne) | première virgule seulement                               | identique au desktop                            | règles partagées                                                     |
| Entrée fixe : montant (formulaire et éditeur en ligne)                     | virgule ou point, décimales illimitées (`12,555` envoyé) | identique au desktop                            | deux décimales au plus                                               |
| Année des enveloppes                                                       | entier, `type="number"`                                  | clavier numérique (`inputMode="numeric"`)       | inchangé (pas de décimale)                                           |
| `FormOperationFixe/FormCardOperationFixe.jsx`                              | `type="number"`, utilisé seulement par des tests         | non affiché                                     | inchangé (code mort, suppression à prévoir)                          |

Vérifié par `test/vitest/decimalInput.test.js`,
`test/vitest/decimalForms.test.jsx` et `test/e2e/decimalInput.spec.js`
(Chromium, et Firefox via une configuration locale temporaire, à 1440 et
390 px).
