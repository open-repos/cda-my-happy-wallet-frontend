# Revue visuelle des actions Web

Captures avec données fictives identiques, date de test au 27 octobre 2026.
Avant = tag v1.8.0 ; après = branche de #305. Chromium local, sans compte ni
écriture de production. Les cadrages diffèrent lorsque le formulaire compact ou
la nouvelle zone de défilement modifie sa position ; les dimensions de viewport
et les données restent identiques. Les couleurs et le focus ont été inspectés.

| Format / thème      | Objectif avant                        | Objectif après                       | Formulaire avant                     | Formulaire après                    |
| ------------------- | ------------------------------------- | ------------------------------------ | ------------------------------------ | ----------------------------------- |
| iPhone 390 clair    | [Avant](before-390-light-goals.webp)  | [Après](after-390-light-goals.webp)  | [Avant](before-390-light-form.webp)  | [Après](after-390-light-form.webp)  |
| iPhone 390 sombre   | [Avant](before-390-dark-goals.webp)   | [Après](after-390-dark-goals.webp)   | [Avant](before-390-dark-form.webp)   | [Après](after-390-dark-form.webp)   |
| Desktop 1440 clair  | [Avant](before-1440-light-goals.webp) | [Après](after-1440-light-goals.webp) | [Avant](before-1440-light-form.webp) | [Après](after-1440-light-form.webp) |
| Desktop 1440 sombre | [Avant](before-1440-dark-goals.webp)  | [Après](after-1440-dark-goals.webp)  | [Avant](before-1440-dark-form.webp)  | [Après](after-1440-dark-form.webp)  |

Les vues de formulaire montrent le focus obtenu au clavier sur Enregistrer.
Le fond sombre conserve des titres, libellés et saisies clairs ; le texte sombre
sur le bouton sauge clair est intentionnel et contrasté. La zone du FAB est une
rangée de layout séparée sur mobile, puis est masquée lorsque le formulaire
s'ouvre. Les cartes et les actions peuvent défiler au-dessus de cette rangée.

Les contrôles automatisés couvrent aussi 320 et 768 px, les deux thèmes et le
texte à 200 %. Ces preuves ne remplacent ni les références visuelles du runner
canonique ni Safari sur appareil réel.

La [revue canonique](canonical-review.md) documente les 58 références PNG mises à jour depuis le runner CI et la préservation du contenu complet.
