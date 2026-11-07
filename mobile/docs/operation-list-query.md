# Tri et filtres natifs des opérations — #387

Les listes d’opérations ponctuelles et de budget fixe proposent un panneau
« Trier et filtrer » adapté au toucher. Le tri et les critères sont choisis
puis appliqués ensemble. Fermer ou annuler laisse la liste inchangée. Les
filtres actifs sont résumés, retirables et effaçables ; effacer conserve le tri.
Chaque application ou retrait est annoncé. Les contrôles utilisent les tokens
mobiles, les deux thèmes et des cibles d’au moins 48 dp, sans hauteur maximale
qui tronquerait le texte agrandi.

## Opérations ponctuelles

La passerelle envoie les paramètres du Web à `GET /v1/operations` : `sort`
(`date`, `title`, `category`, `amount`), `order`, `from`, `to`, `title`,
`categoryId` répété, `type` (`DEPENSE`, `ENTREE`), `minAmount`, `maxAmount`.
Le type se filtre sans se trier. Sans tri explicite, le serveur garde son ordre
par défaut, date décroissante. Les filtres se combinent en ET et les catégories
en OU (20 au maximum). Les montants français sont normalisés en chaînes
à deux décimales, sans conversion monétaire. Une plage inversée, un montant
invalide ou une date impossible empêche l’application et affiche une erreur.

Le libellé accepte une suggestion ou un texte libre de 50 caractères maximum.
Les suggestions viennent de `GET /v1/operations/suggestions/titles` avec `q`,
`limit=10`, et un curseur opaque. La saisie est temporisée de 250 ms, les
requêtes obsolètes sont annulées et leurs réponses ignorées. Le bouton pour
charger la suite permet de parcourir les pages sans défilement automatique.
Une erreur propose un nouvel essai ; le texte libre reste disponible.

Chaque changement repart de la première page. Le curseur précédent est
immédiatement invalidé et la suite n’est pas proposée pendant l’actualisation.
Les lignes restent visibles jusqu’à la nouvelle réponse ; un échec les conserve
avec « Réessayer l’actualisation ». Une réponse d’une ancienne recherche ne peut
pas remplacer la recherche courante. Après une écriture, la requête active est
conservée ; une relecture silencieuse conserve sa fenêtre de pagination.

## Budget fixe

La collection paginée est chargée en entier avant le tri et les filtres locaux,
comme sur le Web. Les neuf critères restent disponibles : libellé, type,
catégorie, total par échéance, devise, périodicité, part personnelle,
personnel par échéance et personnel par mois. Par défaut, le personnel par mois
est décroissant. Les égalités utilisent le libellé puis la clé stable ; les
valeurs indisponibles restent à la fin dans les deux directions.

Le libellé ignore casse et accents ; catégorie (y compris « Non catégorisé »),
type et périodicité se combinent avec lui. Les montants personnels et mensuels
reçus du serveur restent autoritaires. Les revenus sont mensuels et utilisent
leur montant, comme le Web. Les anciennes charges sans périodicité ni part
utilisent seulement le repli historique mensuel à 100 %, sans nouveau calcul.
Aucune mensualisation, répartition ou conversion de devise n’est ajoutée.

Les critères restent dans l’état de l’écran natif, sans modifier les URL Web.
Les formulaires d’écriture et les résumés financiers ne sont pas modifiés.

## Validation

Tests du domaine et de la passerelle : paramètres identiques au Web, plages,
50 caractères, catégories multiples, suggestions paginées et champs serveur.
Les parcours navigateur couvrent la pagination, les réponses obsolètes,
l’actualisation en erreur, les filtres locaux sur toutes les pages,
320/390/768/1440 px, clair/sombre et texte agrandi à ×2.

Les références visuelles sont adoptées depuis le rendu CI après inspection,
sans assouplir le seuil de comparaison. La recette sur development build
Android Pixel 5 avec grandes polices, TalkBack vocal et iOS reste regroupée
avec la recette de fin de parité #213. Expo Web ne remplace pas cette recette.
