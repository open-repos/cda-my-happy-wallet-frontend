# Contrôles responsive et références visuelles Web

Le ticket #62 ajoute une comparaison de captures versionnées aux tests fonctionnels
et aux contrôles d'accessibilité existants. Les wireframes 1440 px cités dans
[ux-design-references.md](ux-design-references.md) guident les parcours ; les
captures du code exécuté fournissent la référence aux trois largeurs réelles.

## Matrice

| Profil Chromium | Dimensions CSS | Interaction              |
| --------------- | -------------- | ------------------------ |
| Téléphone       | 390 × 844      | tactile, viewport mobile |
| Tablette        | 768 × 1024     | tactile                  |
| Bureau          | 1440 × 900     | souris et clavier        |

Chaque profil couvre les thèmes clair et sombre : connexion, inscription,
accueil, calendrier, objectifs/événements, opérations, catégories, analyses et
profil. Les opérations ajoutent les états chargement, vide et erreur à l'état
alimenté : **72 captures** au total. L'état de chargement reste suspendu sur une
promesse contrôlée, sans temporisation arbitraire ; le vide et l'erreur utilisent
respectivement une réponse vide et un HTTP 503 synthétiques. Les repères, annonces
et commandes de reprise sont contrôlés avant la capture.

Les assertions de géométrie refusent les contrôles hors viewport et les commandes
qui se chevauchent, en complément du contrôle de largeur du document. Les tests
responsive existants restent exécutables par `npm run test:e2e` et partagent les
mêmes fixtures que les références visuelles. Les tests d'accessibilité et la
stack E2E réelle restent décrits dans [web-accessibility.md](web-accessibility.md)
et [web-e2e-stack.md](web-e2e-stack.md).

## Reproduire une comparaison

```bash
npm ci
npx playwright install --with-deps chromium
npm run test:visual
```

La CI utilise Node 22 et le Chromium associé au Playwright verrouillé par le
lockfile. Le serveur sert un build Vite dédié (`dist-visual`) avec API relative,
indépendant du build livré. Les références PNG sont sous
`test/visual/snapshots/{mobile,tablet,desktop}/`. Le contrôle normal ne crée ni ne
réécrit une référence manquante : il échoue. Aucun retry ne masque un écart.

La locale française, le fuseau de Paris, la date fixe du 18 octobre 2026, le
facteur de pixels 1 et le mouvement réduit stabilisent le rendu. Les polices sont
attendues et les graphiques doivent avoir créé leur canvas avant capture. Une
faible tolérance de 0,2 % de pixels (seuil par pixel 0,15) absorbe l'anticrénelage ;
les contrôles géométriques restent indépendants de cette tolérance.

## Examiner et mettre à jour les références

Une modification visuelle voulue demande une comparaison des anciennes et
nouvelles images à chaque largeur. Utiliser le même environnement Linux/Chromium
que la CI, puis :

```bash
npm run test:visual:update
npm run test:visual
```

Versionner uniquement les PNG approuvés et les changements qui les justifient.
Ne pas élargir la tolérance pour faire disparaître une régression. Les différences
et captures d'échec sont conservées trois jours dans l'artefact GitHub
`web-visual-evidence`, à partir de données exclusivement synthétiques. Les traces,
vidéos et exports de storage sont désactivés. La première génération de référence
est relue avant l'activation de la comparaison normale dans la PR.

## Limites et retour arrière

Les fixtures partagées remplacent les frontières HTTP. Aucun compte, token signé,
service de production, email ou donnée personnelle réelle n'est utilisé ; les
requêtes non locales non explicitement simulées sont bloquées. Les captures ne
prouvent pas le comportement d'une API réelle, d'un navigateur iOS, d'une
application native ou de l'installation PWA. Elles complètent les 24 parcours
réels isolés et les tests unitaires, sans les remplacer.

Aucun changement fonctionnel ni migration n'est requis. Une régression peut être
reproduite en déplaçant temporairement une commande hors du viewport : le test
concerné doit échouer même si les références sont inchangées. Restaurer ensuite
le code et relancer la comparaison. Revenir en arrière par revert de la PR puis
exécution des contrôles Web ; aucune donnée ou infrastructure à nettoyer.
