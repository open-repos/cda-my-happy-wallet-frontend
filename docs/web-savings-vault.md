# Coffre Web/PWA

Issue [#395](https://github.com/open-repos/cda-my-happy-wallet-frontend/issues/395),
parent #394 ; dépend du backend #183 / PR #185 fusionnée dans `develop`
(`7f85c0e17ba9dd061a6cc931b2b3c7a70c4bf84e`). Contrat :
[`savings-accounts.md`](https://github.com/open-repos/cda-my-happy-wallet-backend/blob/7f85c0e17ba9dd061a6cc931b2b3c7a70c4bf84e/docs/savings-accounts.md)
et OpenAPI du backend. Le client authentifié commun fournit le préfixe `/v1`.

## Parcours

`/coffre` conserve la navigation latérale et le tiroir existants. Le compte
courant expose le **budget disponible** de l’application, par mois passé ou
courant et par devise, avec ses mouvements et les composantes du budget. Ce
montant ne représente pas un solde bancaire connecté.

Les comptes d’épargne sont paginés par curseur opaque, puis affichés dans les
vues Actifs et Archivés. Si une page ne contient aucun compte du filtre choisi,
le bouton de suite reste disponible. Le détail utilise `?compte=<id>` ;
`?compte=current` ouvre l’historique du compte courant. Les identifiants de cet
historique sont composés de la source et de l’identifiant : une opération et un
virement peuvent partager le même numéro.

Création (nom, devise et épargne initiale), renommage, archivage confirmé et
annulable, dépôt/retrait manuels et rattachement explicite d’un objectif sont
disponibles. L’archivage conserve le solde et l’historique ; le contrat ne
propose ni restauration, ni détachement. Un objectif dont l’épargne est positive
nécessite un compte vierge ; le serveur arbitre les conflits. Les objectifs de
même devise et sans compte sont proposés. L’épargne et la devise d’un objectif
rattaché restent celles du compte lors de l’édition de ses autres paramètres.

## Montants et écritures

Les entrées sont converties en centimes entiers par le parseur décimal partagé.
Les soldes et la progression proviennent du serveur. L’interface ne simule pas
de nouveaux soldes : elle explique le sens du virement et son incidence, puis
recharge les résultats. Le solde initial ne débite pas le compte courant. Les
virements restent exclus des dépenses et revenus des Analyses.

Chaque virement possède une clé générée à la soumission. Une réponse perdue ou
un échec serveur laisse la tentative et ses champs figés dans le dialogue.
« Vérifier les mouvements » ouvre une lecture de l’historique ; « Reprendre ce
virement » renvoie le même corps avec la même clé. Une réponse HTTP reconnue,
même illisible, ferme la phase d’écriture. Tout échec ultérieur propose
uniquement de recharger les vues, sans rejouer la mutation. Les tentatives
restent en mémoire du dialogue ; quitter/recharger la page impose de vérifier
l’historique avant de démarrer une nouvelle opération.

Les historiques et la liste des comptes dédoublonnent les résultats, bloquent
les requêtes de suite concurrentes et rejettent les curseurs répétés. Une
réponse ancienne ne remplace pas la vue d’un autre compte/mois/devise.

## Présentation et validation

Maquette autonome `proposals/395-savings-vault` du workspace validée par le
propriétaire le 08/11/2026 avant implémentation. Le MCP Figma a refusé la création
de session pour le fichier de référence (absence de droit d’édition) ; aucun
contenu inaccessible n’a été supposé. Les tokens du dépôt et les dialogues,
boutons, régions `LiveMessage` et annonces de chargement existants sont réutilisés.
Les dimensions de grille (deux colonnes, seuil 768 px), flex et focus offset
sont des règles de mise en page locales ; les couleurs, espacements, tailles
de caractères, contrôles et rayons consomment les tokens.

Les scénarios unitaires sont dans `savingsService`, `useSavings`, `savingsForms` ;
les parcours navigateur dans `test/e2e/savings.spec.js` couvrent 320, 390, 768 et
1440 px, clair et sombre. Les références visuelles Coffre et virement sont dans
`test/visual/savings.spec.js`. Les références de navigation existantes changent
avec la nouvelle destination.

Les confirmations mensuelles disposent d’une API livrée mais leur interface
reste hors du périmètre validé de #395. La décision de fin de mois (#396), son
backend #184 et le mobile #397 sont distincts. Aucune migration, dépendance,
configuration, fusion ou mise en production dans ce changement.
