# Maquettes des actions Web/PWA après v1.8.0

Propositions du 27 octobre 2026, en attente du choix du propriétaire.
L'application n'importe aucun fichier de ce dossier.

`ux-directions-1.8.0.html` contient la source de revue interactive affichée dans
la conversation. Son carrousel et ses icônes de prévisualisation sont rendus par
l'hôte de la conversation ; ce n'est pas une nouvelle page de production.
L'implémentation retenue réutilisera Font Awesome et les primitives Web déjà
proposées dans #305, après revue, sans ajouter Lucide au projet.

## Matrice de revue

| Sélecteur   | Valeurs                                                                                 |
| ----------- | --------------------------------------------------------------------------------------- |
| Direction   | Minimal Sauge ; Fintech moderne ; Ergonomie mobile native                               |
| Format      | iPhone (390 px), tablette (834 px), desktop (1280 px), avec repli sur écran plus étroit |
| Apparence   | Clair ; sombre                                                                          |
| Vue         | Contenu/FAB ; formulaire ; formulaire avec clavier illustré ; états des boutons         |
| FAB         | Ouvrir/fermer ; menu conservant le 27 octobre ; actions proches et zone réservée        |
| Actions     | Ajouter, Modifier, Convertir, Annuler, Enregistrer, Supprimer                           |
| Destruction | Confirmation nominative, Annuler focalisé, retour au déclencheur                        |

La variante Fintech emploie des actions plus compactes, des rangées de cartes et
un panneau latéral sur grand écran. Minimal Sauge privilégie le dialogue simple,
les contours et une élévation discrète. La variante native regroupe les champs
en lignes et met les actions contextuelles en avant, avec un FAB libellé.
Les différences ne sont pas limitées à la palette.

Les montants sont fictifs et les interactions locales ne réalisent aucune
requête. Le clavier est une illustration AZERTY simplifiée : ni un clavier
système réel ni une preuve de comportement Safari.

## Vérification de composition

Les 18 combinaisons direction × format × apparence ont été rendues sous
Chromium : ouverture/fermeture du FAB, aller-retour des radios, affichage du
clavier illustré, absence de débordement horizontal des contrôles.
Les rendus téléphone clair, téléphone sombre et clavier native ainsi que le
panneau desktop sombre ont été inspectés visuellement.

Contrastes calculés sur les couleurs des maquettes :

| Paire                             | Ratio   |
| --------------------------------- | ------- |
| Texte principal clair / surface   | 13,31:1 |
| Texte secondaire clair / surface  | 6,52:1  |
| Action sauge clair                | 7,56:1  |
| Action sauge sombre               | 9,55:1  |
| Action Fintech clair              | 6,01:1  |
| Action Fintech sombre             | 7,19:1  |
| Destruction clair                 | 6,80:1  |
| Destruction sombre                | 7,17:1  |
| Bordure de champ clair / surface  | 3,68:1  |
| Bordure de champ sombre / surface | 3,78:1  |

Ces contrôles portent sur les maquettes. Ils ne remplacent ni les tests de la
future implémentation, ni sa recette réelle iPhone, clavier et VoiceOver.
Les couleurs locales du prototype devront être rapprochées du contrat de tokens
avant de modifier les composants de production.

Voir [l'audit et la recommandation](../ux-audit-1.8.0.md) pour les compromis et
le périmètre restant. Aucun changement des workflows, du backend, de
l'infrastructure PWA, de la release ou du déploiement.
