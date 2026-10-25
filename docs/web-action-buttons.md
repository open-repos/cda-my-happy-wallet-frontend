# Actions partagées — #296

Button est une primitive de présentation : variante, icône injectée, nom,
focus/ref, type et états busy/disabled. ActionButton adapte les actions Ajouter,
Modifier et Supprimer aux icônes Font Awesome existantes. Les mutations,
validations, confirmations et invalidations restent dans les conteneurs métier.
Le type par défaut est button, submit reste explicite.

Les formulaires d'opération, événement et objectif réutilisent DeleteConfirmation
pour une confirmation nominative inline. Annuler reçoit le focus ; la fermeture
le rend au déclencheur encore présent. Les confirmations de liste déjà existantes
sont conservées. Supprimer combine corbeille, libellé, bordure et texte destructifs
contrastés ; la couleur seule ne porte pas le sens. Les actions compactes sont
visibles sans survol et peuvent s'empiler. Cibles minimales 44 px, libellés
multilignes, tokens des deux thèmes ; aucun second CRUD.

Le bouton flottant garde sa date, sa position et son menu. Son contour contrasté
et son ombre renforcée le distinguent sur un fond de même couleur. L'ajout de ce
relief répond au complément explicite du propriétaire. Les tests vérifient le
contour sur téléphone et les parcours d'édition aux quatre tailles ; les anciens
tests d'opacité au survol suivent maintenant l'exigence d'actions toujours visibles.
Les seuils visuels ne sont pas assouplis ; les références modifiées par les
nouveaux boutons nécessitent une revue ciblée du runner canonique.
