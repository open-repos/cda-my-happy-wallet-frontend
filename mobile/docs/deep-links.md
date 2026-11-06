# Liens email et deep links (#30, #219)

## Liens reçus

Les emails du backend pointent vers le site Web, jamais vers l'application :

| Email                      | Lien                                                                                                                        | Prise en charge mobile                                 |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| Confirmation d'inscription | `API/v1/users/verify/:id/:token`, qui redirige vers `/login?confirmation=…` ou `/login?success=true&message=registrationok` | écran de connexion avec le message du Web (#30)        |
| Mot de passe oublié        | `/new-password?resetToken=…`                                                                                                | écran « Choisissez votre nouveau mot de passe » (#219) |

Le lien de vérification d'inscription reste traité par l'API dans le
navigateur ; seule la page `/login` de destination concerne l'application.
Application non installée : les deux liens ouvrent les pages Web habituelles.

## Entrées dans l'application

- **Schéma** `myhappywallet://` (`app.json`, `scheme`) :
  `myhappywallet://login?confirmation=already-used`,
  `myhappywallet://new-password?resetToken=…`.
- **HTTPS sur Android** : filtre d'intention `VIEW` sur
  `https://myhappywallet.andriacapai.com/login` et `/new-password`
  uniquement, **sans `autoVerify`**. Sans fichier
  `/.well-known/assetlinks.json` publié avec l'empreinte du certificat de
  signature, Android 12+ ouvre ces liens dans le navigateur par défaut ;
  l'utilisateur peut activer « Ouvrir les liens compatibles » dans les
  réglages de l'application. La vérification App Links et les Universal Links
  iOS (`associatedDomains`) demandent une décision et des empreintes du
  propriétaire : hors #30 et #219.

## Routage

`app/+native-intent.tsx` passe chaque lien entrant (démarrage à froid et
application ouverte) à `resolveIncomingLink`
(`src/navigation/incomingLinks.ts`) :

- `/login` (ou `/sign-in`) d'un lien possédé → `/sign-in?confirmation=<issue>`,
  avec `confirmed`, `already-used` ou `invalid-or-expired` uniquement ;
- `/new-password` → `/new-password?resetToken=<jeton>` si le jeton a le format
  exact du backend (128 caractères hexadécimaux minuscules), sinon
  `/new-password` seul, qui explique que le lien est invalide ;
- autre chemin possédé → `/`, **sans sa query** ;
- lien non possédé (autre hôte, port, identifiants, `http`, URL du development
  client `exp+my-happy-wallet://…`) → inchangé.

Un lien HTTPS de l'hôte avec un port explicite reste non possédé : Android
peut le livrer (le filtre n'impose pas de port) et Expo Router affiche alors
l'écran de route inconnue, sans fuite. Les routes internes par schéma
(`myhappywallet://calendar`) ouvrent `/`.

Tout autre paramètre est abandonné et rien n'est journalisé. L'analyse est
faite sans `URL`, dont le polyfill React Native ne lit pas
`hostname`/`pathname` hors HTTP(S).

Les écrans retirent ensuite le paramètre reçu de la route
(`src/navigation/useClearedRouteParam.ts`), pour qu'il ne reste ni dans
l'historique ni dans l'URL et qu'un retour arrière ne le rejoue pas. Un
`setParams` lancé au montage est perdu pendant l'hydratation de l'état initial
du routeur : le hook le relance à chaque changement de l'état racine jusqu'à
disparition du paramètre (vérifié par `test/visual/new-password.spec.ts`).

## Nouveau mot de passe (#219)

Contrat backend inchangé, le même que le Web :

1. `GET /v1/users/reset-password/:token` valide le jeton et le dépose dans le
   cookie httpOnly `reset_token_password` (15 min) ; 401 si invalide ou
   expiré.
2. `POST /v1/users/new-password` avec `{ password, confirmPassword }` relit ce
   cookie, enregistre le mot de passe et efface le cookie ; 401 si le jeton a
   expiré ou a déjà servi.

Les deux appels passent `credentials: "include"` pour que la pile HTTP native
conserve le cookie entre les deux requêtes (sur iOS, sans cette option, les
cookies ne sont ni gardés ni renvoyés). Le traitement réel du cookie
(`sameSite: strict`, `secure` en production) par Android et iOS est **à
confirmer en recette #213**. Les autres appels publics n'envoient pas de
cookie.

L'écran (`app/new-password.tsx`, hors des groupes protégés : ouvert avec ou
sans session) suit `usePasswordReset` :

- vérification du lien, puis formulaire ;
- mêmes règles et messages de mot de passe que l'inscription
  (`getPasswordValidationError`, règle `nestedStrongPassword` du backend) ;
- jeton refusé (401, 403, 404) ou format invalide : « Ce lien de
  réinitialisation est invalide, a expiré ou a déjà été utilisé », avec
  « Demander un nouveau lien » vers `forgot-password` ;
- réseau, limite de débit ou erreur serveur : message temporaire et
  « Réessayer », le jeton restant en mémoire pendant que l'écran est ouvert ;
- succès : confirmation et retour à la connexion ; le jeton est oublié.

Le jeton n'est gardé qu'en mémoire React : jamais journalisé, jamais écrit
dans le stockage sécurisé, retiré de la route dès sa lecture. Les erreurs
réseau ne relaient pas l'erreur d'origine, qui peut contenir l'URL. Après un
échec, le cookie expire de lui-même (15 min) ; après succès, l'API l'efface.

## Session et erreurs

- Session en cours de restauration : le lien initial est lu par Expo Router
  au montage de la navigation ; pour un lien reçu application ouverte pendant
  l'écran de restauration ou d'indisponibilité, le comportement est **à
  confirmer en recette #213**.
- Utilisateur déjà connecté : le lien de confirmation renvoie vers
  l'application (garde `Stack.Protected`), le message n'est pas affiché ; le
  lien de réinitialisation ouvre l'écran normalement.
- Confirmation d'inscription : la vérification se fait dans le navigateur ;
  un lien invalide ou expiré arrive comme `confirmation=invalid-or-expired` et
  est expliqué avec renvoi vers une nouvelle inscription, comme sur le Web.

## Retour arrière

Retirer `android.intentFilters` de `app.json` et `app/+native-intent.tsx`,
puis reconstruire le development build : les liens HTTPS s'ouvrent de nouveau
dans le navigateur et le schéma retrouve le routage par défaut d'Expo Router.
Pour #219 seul, retirer l'entrée `/new-password` du filtre et
`EMAIL_LINK_PATHS` : le lien de réinitialisation repasse par la page Web.

## Recette Android (development build)

Les filtres d'intention étant natifs, reconstruire le development build
([guide](android-development-build.md)), puis :

```bash
PKG=com.andriacapai.myhappywallet
adb shell am start -a android.intent.action.VIEW -d "myhappywallet://login?confirmation=already-used" "$PKG"
adb shell am start -a android.intent.action.VIEW -d "https://myhappywallet.andriacapai.com/login?success=true&message=registrationok" "$PKG"
adb shell am start -a android.intent.action.VIEW -d "https://myhappywallet.andriacapai.com/login?confirmation=invalid-or-expired" "$PKG"
adb shell am start -a android.intent.action.VIEW -d "myhappywallet://new-password?resetToken=essai" "$PKG"
```

Attendus : écran de connexion avec le message correspondant, à froid et
application ouverte ; dernier lien → écran de nouveau mot de passe indiquant
un lien invalide, sans jeton visible ; session ouverte → tableau de bord pour
les liens de connexion.

Réinitialisation réelle (#219) : demander un lien depuis l'application
(« Mot de passe oublié »), ouvrir l'email sur l'appareil, choisir
l'application, définir un mot de passe, se connecter avec. Rouvrir ensuite le
même lien : il doit être expliqué comme déjà utilisé. À faire aussi avec de
grandes polices (Pixel 5). Recette regroupée avec la fin de parité mobile
(#213).
