# Activation et mises à jour PWA — #53

Le point d’entrée Web monte `PwaUpdates`, dont l’inscription est **désactivée par
défaut**. Le composant ne rend alors aucun contenu et ne crée aucun client de
worker. Le manifeste et les icônes restent utilisables indépendamment.

## Condition d’activation

`VITE_PWA_ENABLED=false` est documenté dans `.env.example`. Seule la chaîne exacte
`true` dans un build de production Vite permet l’inscription. Cette valeur est une
configuration publique incorporée au build, pas un secret. Le serveur de
développement ne l’active pas.

#50 et backend #98 sont livrés. Faute d’environnement de staging, le
propriétaire a choisi d’activer la PWA directement en production, une fois le
retrait explicite (ci-dessous), la rétention des assets du déploiement
([CI/CD](ci-cd.md)) et les en-têtes Nginx de `/sw.js` et du manifeste en place.
La recette physique iOS/Android/desktop de #54 se fait alors sur la production.
Vérifier avant toute inscription les exigences MIME, historique de version et
rétention d’assets de [la livraison du worker](pwa-versioned-worker.md).

Les deux drapeaux sont lus **au build**. Dans GitLab, les définir comme
variables CI/CD de type Variable avec la portée d’environnement `All (*)` :
le job `build` n’a pas d’environnement et ne voit pas une variable limitée à
`production`. Les protéger les réserve aux branches protégées, dont `main` : les
pipelines de merge request construisent donc toujours sans PWA.

| `VITE_PWA_ENABLED` | `VITE_PWA_RETIRE` | Effet du build déployé                                     |
| ------------------ | ----------------- | ---------------------------------------------------------- |
| absent ou `false`  | absent ou `false` | Aucune inscription ; un worker installé reste              |
| `true`             | indifférent       | Inscription et avis de mise à jour                         |
| absent ou `false`  | `true`            | Retrait du worker `/sw.js` et des caches `mhw-public-v1-*` |

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
visuel est un toast flottant compact en bas de fenêtre, sans déplacer le contenu.
Il respecte les zones de sécurité iOS, les tokens de thème, les cibles d’au moins
44 pixels et le focus visible ; il ne vole pas le focus. Sa fermeture masque
l’avis jusqu’au prochain retour au premier plan ou à la restauration de la page,
tant qu’une mise à jour reste en attente. Un changement d’étape le réaffiche aussi.
Il ne disparaît pas sur minuterie. Aucun choix de fermeture n’est persisté et la
fermeture ne déclenche ni activation ni rechargement.

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
à retirer l’interface. Après activation réelle, deux retours arrière existent :

- **Revenir à une version précédente de la PWA** : redéployer un ensemble
  cohérent d’assets et de worker selon la procédure versionnée ; le même
  parcours explicite présente une version de rollback.
- **Retirer la PWA** : redéployer un build avec `VITE_PWA_ENABLED` absent ou
  différent de `true` **et** `VITE_PWA_RETIRE=true`. Un drapeau simplement
  absent ne retire rien, pour qu’une variable oubliée ne désinstalle pas la PWA
  chez tous les clients. Au chargement, `retirePwa`
  (`src/js/pwa/retireWorker.js`) désinscrit uniquement le worker `/sw.js` de
  l’origine courante et supprime uniquement les caches `mhw-public-v1-*`. Il
  n’affiche rien et ignore les refus du navigateur. La page déjà ouverte reste
  contrôlée jusqu’à son prochain chargement ; un onglet resté sur l’ancien
  build actif peut afficher « mise à jour indisponible » jusqu’à son
  rechargement. Vérifier ensuite dans les outils du navigateur qu’aucun worker
  ni cache `mhw-public-v1-*` ne subsiste. Garder `VITE_PWA_RETIRE=true` tant que
  des clients peuvent revenir, puis le retirer.

Ne pas effacer des caches ou inscriptions d’autres applications. Retirer
simplement `sw.js` du serveur ne désinscrit pas un worker déjà installé : le
retrait passe par le build désactivé, chargé au moins une fois par chaque client.

Le cache privé HTTP avant contrôle du worker repose sur le contrat du backend #98 (`Cache-Control: private, no-store`), à revérifier après chaque changement du proxy.
La synchronisation hors ligne, les notifications push, les modifications des
formulaires métier et la recette des appareils physiques ne font pas partie de
cette unité. Le navigateur reste libre d’évincer le cache public.

Sources : [cycle de vie des service workers](https://developer.chrome.com/docs/workbox/service-worker-lifecycle)
et [spécification Service Workers](https://w3c.github.io/ServiceWorker/).
