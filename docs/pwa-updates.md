# Activation et mises à jour PWA — #53

Le point d’entrée Web monte `PwaUpdates`, dont l’inscription est **désactivée par
défaut**. Le composant ne rend alors aucun contenu et ne crée aucun client de
worker. Le manifeste et les icônes restent utilisables indépendamment.

## Condition d’activation

`VITE_PWA_ENABLED=false` est documenté dans `.env.example`. Seule la chaîne exacte
`true` dans un build de production Vite permet l’inscription. Cette valeur est une
configuration publique incorporée au build, pas un secret. Le serveur de
développement ne l’active pas.

**Conserver la valeur false tant que #50/backend #98 et la recette intégrée en
staging ne sont pas validés.** Cette livraison n’active aucune instance réelle,
ne configure aucun environnement et ne déploie pas en production. La recette
physique iOS/Android/desktop de #54 reste distincte des profils navigateur.

Une fois ces prérequis satisfaits, le build de staging peut être produit avec la
valeur `true`, puis testé avec son vrai hébergement HTTPS et son contrat HTTP.
Vérifier les exigences MIME, historique de version et rétention d’assets de
[la livraison du worker](pwa-versioned-worker.md) avant toute inscription.

## Comportement

Le client attend le chargement complet du document. Dans un contexte sécurisé avec
support des service workers, il inscrit exclusivement `/sw.js`, de portée `/`,
avec `updateViaCache: none`. Il observe les candidats déjà présents et les
installations suivantes. Le retour en ligne et le retour au premier plan peuvent
vérifier une nouvelle version ; aucune boucle de polling n’est ajoutée.

La première installation ne provoque aucun rechargement ni avertissement inutile.
Lorsqu’une version attend, une région de mise à jour propose « Préparer la mise à
jour ». Cette action demande l’activation au worker. Un changement de contrôleur
affiche ensuite « Recharger l’application ». **Le rechargement requiert un second
clic explicite ; aucun événement du worker ne recharge automatiquement une page.**

Chaque fenêtre garde ainsi son document et ses valeurs saisies, même si une autre
fenêtre active le nouveau worker. Elle reçoit son propre avis de rechargement.
Le worker peut prendre le contrôle des requêtes sans recharger ces documents : les
assets précédents doivent rester disponibles sur le serveur pendant la transition.

Avant activation et avant rechargement, le client bloque l’action s’il trouve un
formulaire, une boîte de dialogue, une zone éditable ou un élément `aria-busy=true`
dans le document. Ce choix est volontairement conservateur : même un formulaire
vierge doit être terminé ou fermé. Sur une page à formulaire permanent, rejoindre
une vue sans formulaire avant de continuer. Le client ne lit ni ne compare les
valeurs saisies et n’ajoute aucun indicateur privé persistant. Il ne remplace pas
les règles de soumission métier et ne rejoue aucune requête.

Hors ligne, les actions restent différées avec une explication. Un candidat qui
échoue laisse l’ancienne version active ; un bouton permet de réessayer. Les
messages affichés sont génériques, sans contenu d’erreur technique, URL privée ou
donnée de session. L’attente du message d’activation est bornée à cinq secondes,
puis celle du changement de contrôleur à dix secondes. Les ports, délais et
écouteurs sont nettoyés à la fin de leur usage ou au démontage.

L’annonce accessible est montée vide avant les messages et reste stable. L’avis
visuel participe au flux du document, utilise les tokens de thème, propose une
cible d’au moins 44 pixels et un focus visible ; il ne vole pas le focus.

## Vérification reproductible

```bash
npm ci
npm test
npm run build
npm run test:pwa:builder
npm run test:pwa:proof
npm run test:pwa:built
npm run test:e2e -- test/e2e/pwaManifest.spec.js
```

Les tests unitaires couvrent le mode désactivé/non sécurisé/non supporté, le
chargement initial, les gardes d’édition, les deux confirmations, l’absence de
rechargement initial, le réseau, les délais, les erreurs et le nettoyage.

La suite du worker compilé construit séparément une page synthétique qui exécute
le vrai composant React et son client, face au vrai worker généré. Elle vérifie
deux fenêtres, la conservation de saisies fictives, les gardes d’édition, le réseau
coupé, l’activation explicite et le rechargement séparé, le zoom à 200 %, le clavier,
un candidat défaillant, la reprise et le rollback sur trois profils. La page, son
bundle et ses commandes de test ne sont jamais inclus dans `dist/` ni le précache.
Les tests Web habituels vérifient aussi que le build par défaut n’inscrit aucun
worker. Aucun compte ou donnée réelle n’est nécessaire.

## Retour arrière et limites

Avant la première inscription, conserver `false` et revenir sur cette PR suffit
à retirer l’interface. **Désactiver le drapeau ne désinscrit pas un worker déjà
installé.** Après activation réelle, revenir à un ensemble cohérent d’assets et
de worker selon la procédure versionnée ; le même parcours explicite présente
une version de rollback. Ne pas effacer des caches ou inscriptions d’autres
applications. Une suppression définitive d’un worker déjà livré exige une
procédure de retrait sur son origine et sa portée, puis sa vérification sur les
clients concernés ; elle ne se fait pas en retirant simplement `sw.js` du serveur.

Le cache privé HTTP avant contrôle du worker dépend toujours du backend #98.
La synchronisation hors ligne, les notifications push, les modifications des
formulaires métier et la recette des appareils physiques ne font pas partie de
cette unité. Le navigateur reste libre d’évincer le cache public.

Sources : [cycle de vie des service workers](https://developer.chrome.com/docs/workbox/service-worker-lifecycle)
et [spécification Service Workers](https://w3c.github.io/ServiceWorker/).
