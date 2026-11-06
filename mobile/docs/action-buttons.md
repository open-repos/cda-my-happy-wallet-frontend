# Actions natives partagées — #297

Button est une primitive de présentation indépendante des services et du domaine.
Elle expose libellé, icône Ionicons existante, variante, ref, chargement et
indisponibilité. ActionButton adapte Ajouter, Modifier et Supprimer sans déplacer
les mutations, validations ou invalidations des conteneurs existants.

La suppression associe corbeille, libellé et contraste destructif. Les cibles
mesurent au moins 48 px, le texte se replie et les thèmes utilisent les tokens
existants. Les confirmations d'événement, catégorie et objectif focalisent
Annuler et rendent le focus au déclencheur présent. Les dialogues Alert natifs
restent dans les parcours qui les utilisaient et nomment l'élément supprimé.

Le bouton flottant possède un contour contrasté, une élévation Android et une
ombre iOS ; sa position, le contexte de date et le menu restent inchangés.

Validation : lint, types, tests unitaires, Doctor et export Web Expo ; 12 tests
navigateur synthétiques (4 largeurs × 2 thèmes pour les boutons, CRUD événement
et objectif, ajout rapide). Ces tests Expo Web ne constituent pas une recette
appareil iOS/Android. VoiceOver, TalkBack, clavier virtuel et rendu des ombres
sur appareils restent à vérifier. Aucune référence visuelle remplacée.
