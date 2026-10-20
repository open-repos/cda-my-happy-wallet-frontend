# Capacité d'épargne Web

L'accueil et la page Objectifs affichent la même synthèse du mois civil courant
Europe/Paris. `GET /v1/savings-capacity?from=YYYY-MM&months=1&currency=EUR`
fournit l'effort par objectif actif, les totaux et l'indicateur de soutenabilité.
`GET /v1/budget-forecast` avec la même fenêtre fournit les allocations mensuelle,
hebdomadaire et quotidienne après les versements prévus. Les montants restent
des chaînes décimales de l'API ; aucun objectif ni versement n'est recalculé ici.

Les deux réponses doivent avoir les mêmes devise, mois, date de référence et
solde après versements prévus. Une modification concurrente peut les désaligner :
la synthèse passe alors en erreur avec reprise au lieu de combiner des chiffres
incompatibles. Les réponses obsolètes et celles arrivant après démontage sont
ignorées. Les valeurs non calculables restent distinctes de zéro.

Par objectif : prévu, requis pour tenir la date et écart `requis - prévu`.
L'API omet les objectifs atteints. Un versement nul est indiqué comme exclu des
totaux. Sans échéance future exploitable, requis et écart sont non calculables.
La synthèse distingue les versements réservés de l'épargne déjà déclarée : elle
ne représente pas un virement automatique.

L'indicateur reprend exactement la règle backend : **non tenable** si un solde
après prévu ou requis connu est négatif ; sinon **indéterminé** si le requis est
inconnu ; sinon **tendu** si l'un des soldes est nul ; sinon **tenable**. Le texte
explique ces règles sans seuil arbitraire, conseil financier ou garantie de
paiement à l'intérieur du mois.

L'action « Ajuster le versement » ouvre le formulaire existant de l'objectif.
Depuis l'accueil, `?ajuster=ID` sélectionne l'objectif après chargement et place
le focus dans son formulaire. Il n'est pas rouvert après fermeture. Sur la page
Objectifs, le focus revient au bouton d'ajustement ; une écriture recharge les
objectifs puis la synthèse. Les erreurs de capacité n'empêchent pas la gestion
existante des objectifs.

Les suites `savingsCapacityService`, `useSavingsCapacity`,
`savingsCapacitySection` et `financialGoalsSection` couvrent les frontières,
valeurs inconnues, concurrence, règles affichées et édition ciblée. Les parcours
Playwright `savingsCapacity.spec.js` couvrent l'accueil, l'ajustement, le
rechargement, le clavier et l'erreur/reprise aux trois largeurs. Les références
accueil et objectifs/événements incluent la synthèse dans les deux thèmes.

Aucune migration ni configuration. Une régression se retire par revert de la
PR ; les écritures utilisent le contrat existant des objectifs.

Les tests visuels attendent explicitement la synthèse avant de capturer l'accueil
ou la page Objectifs. Le titre d'objectif est recherché dans sa carte pour ne
pas confondre la progression et la synthèse d'effort. Les références sont relues
dans le runner canonique selon la méthode documentée pour #193 ; les seuils de
comparaison restent inchangés.
