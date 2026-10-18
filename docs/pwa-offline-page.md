# Écran hors connexion neutre — #51

`public/offline.html` est un document français autonome, servi sans React ni
JavaScript. Il explique l’indisponibilité et propose un lien « Réessayer » vers
`/`. Cette navigation repasse par les routes et la protection de session normales.
Elle ne rejoue aucune écriture. Tant que le réseau reste indisponible, le worker
renvoie de nouveau le même écran neutre.

Le document ne lit aucun stockage, cookie, état de session ou budget et ne fait
aucun appel API. Son CSS, sa police système et son pictogramme SVG décoratif sont
autonomes ; aucune ressource distante n’est nécessaire. Les thèmes clair et sombre
suivent la préférence du système, sans consulter la préférence enregistrée dans
l’application. Les couleurs reprennent les tokens sémantiques du design system.

Le titre, le repère principal et le lien sont accessibles au clavier. La cible du
lien mesure au moins 44 pixels de haut et son focus est visible. Les tests
navigateur vérifient les contrastes de texte (4,5:1 minimum), l’absence de
débordement horizontal à 320, 390, 768 et 1440 pixels, et le texte agrandi à 200 %,
dans les deux thèmes. Le retour via le lien est vérifié avec une session anonyme.

## Livraison et vérification

Le générateur #49 inclut automatiquement `/offline.html` dans le précache public
lorsque `npm run build` copie ce fichier dans `dist/`. Il faut servir ce chemin
avec le MIME `text/html`, sans personnalisation ni redirection. La politique du
worker refuse son stockage si la réponse est privée, `no-store`, opaque ou erronée.
Le document lui-même ne contient aucune donnée privée.

```bash
npm test
npm run build
npm run test:e2e -- test/e2e/offlinePage.spec.js
npm run test:pwa:built
```

La suite du worker compilé installe réellement le worker dans une origine locale
isolée, coupe le réseau, vérifie le document de secours, rétablit le réseau puis
vérifie mises à jour et rollback. Ses pages et son API sont synthétiques. Les huit
parcours de présentation utilisent la vraie page statique et les routes Web, sans
faire passer un profil Chromium pour un appareil Android ou iOS.

**L’application n’enregistre toujours pas le worker.** Cette PR rend le document
disponible et vérifie son intégration au build ; l’activation applicative dépend
de #53 et de la validation de confidentialité #50/backend #98. L’installation et
le mode standalone sur appareils restent la recette #54. Aucun déploiement de
production n’est effectué.

Avant activation applicative, revenir sur cette PR puis reconstruire retire le
document et son entrée du précache généré. Après activation, le retrait doit
suivre le cycle de mise à jour et de rollback décrit dans
[le worker versionné](pwa-versioned-worker.md), sans effacer les caches étrangers.
