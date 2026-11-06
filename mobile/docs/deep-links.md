# Liens email et deep links (#30)

## Liens reçus

Les emails du backend pointent vers le site Web, jamais vers l'application :

| Email                      | Lien                                                                                                                        | Prise en charge mobile                                             |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Confirmation d'inscription | `API/v1/users/verify/:id/:token`, qui redirige vers `/login?confirmation=…` ou `/login?success=true&message=registrationok` | écran de connexion avec le message du Web                          |
| Mot de passe oublié        | `/new-password?resetToken=…`                                                                                                | non revendiqué : la page Web s'ouvre ; écran mobile prévu par #219 |

Le lien de vérification lui-même reste traité par l'API dans le navigateur ;
seule la page `/login` de destination concerne l'application.

## Entrées dans l'application

- **Schéma** `myhappywallet://` (`app.json`, `scheme`) : `myhappywallet://login?confirmation=already-used`.
- **HTTPS sur Android** : filtre d'intention `VIEW` sur
  `https://myhappywallet.andriacapai.com/login` uniquement, **sans
  `autoVerify`**. Sans fichier `/.well-known/assetlinks.json` publié avec
  l'empreinte du certificat de signature, Android 12+ ouvre ces liens dans le
  navigateur par défaut ; l'utilisateur peut activer « Ouvrir les liens
  compatibles » dans les réglages de l'application. La vérification App Links
  et les Universal Links iOS (`associatedDomains`) demandent une décision et
  des empreintes du propriétaire : hors #30.

## Routage

`app/+native-intent.tsx` passe chaque lien entrant (démarrage à froid et
application ouverte) à `resolveIncomingLink`
(`src/navigation/incomingLinks.ts`) :

- `/login` (ou `/sign-in`) d'un lien possédé → `/sign-in?confirmation=<issue>`,
  avec `confirmed`, `already-used` ou `invalid-or-expired` uniquement ;
- autre chemin possédé (dont `/new-password`) → `/`, **sans sa query** ;
- lien non possédé (autre hôte, port, identifiants, `http`, URL du development
  client `exp+my-happy-wallet://…`) → inchangé.

Un lien HTTPS de l'hôte avec un port explicite reste non possédé : Android
peut le livrer (le filtre n'impose pas de port) et Expo Router affiche alors
l'écran de route inconnue, sans fuite puisque seul `/login` est revendiqué.
Les routes internes par schéma (`myhappywallet://calendar`) ouvrent désormais
`/` ; aucun code ne s'en servait.

Tout autre paramètre est abandonné : aucun jeton ne traverse la navigation et
rien n'est journalisé. L'analyse est faite sans `URL`, dont le polyfill React
Native ne lit pas `hostname`/`pathname` hors HTTP(S).

L'écran de connexion affiche le message une fois puis retire le paramètre de
la route (`router.setParams`), pour qu'un retour arrière ne le rejoue pas.

## Session et erreurs

- Session en cours de restauration : le lien initial est lu par Expo Router
  au montage de la navigation ; pour un lien reçu application ouverte pendant
  l'écran de restauration ou d'indisponibilité, le comportement est **à
  confirmer en recette #213**.
- Utilisateur déjà connecté : le garde `Stack.Protected` renvoie vers
  l'application ; le message de confirmation n'est pas affiché (le compte est
  déjà utilisable).
- Erreurs réseau : la vérification se fait dans le navigateur ; un lien
  invalide ou expiré arrive comme `confirmation=invalid-or-expired` et est
  expliqué avec renvoi vers une nouvelle inscription, comme sur le Web.

## Retour arrière

Retirer `android.intentFilters` de `app.json` et `app/+native-intent.tsx`,
puis reconstruire le development build : les liens HTTPS s'ouvrent de nouveau
dans le navigateur et le schéma retrouve le routage par défaut d'Expo Router.

## Recette Android (development build)

Le filtre d'intention étant natif, reconstruire le development build
([guide](android-development-build.md)), puis :

```bash
PKG=com.andriacapai.myhappywallet
adb shell am start -a android.intent.action.VIEW -d "myhappywallet://login?confirmation=already-used" "$PKG"
adb shell am start -a android.intent.action.VIEW -d "https://myhappywallet.andriacapai.com/login?success=true&message=registrationok" "$PKG"
adb shell am start -a android.intent.action.VIEW -d "https://myhappywallet.andriacapai.com/login?confirmation=invalid-or-expired" "$PKG"
adb shell am start -a android.intent.action.VIEW -d "myhappywallet://new-password?resetToken=essai" "$PKG"
```

Attendus : écran de connexion avec le message correspondant, à froid et
application ouverte ; dernier lien → écran de départ, sans jeton visible ;
session ouverte → tableau de bord. Recette regroupée avec la fin de parité
mobile (#213).
