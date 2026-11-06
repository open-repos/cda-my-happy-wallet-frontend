# Régression responsive des trajectoires — #301

La capture iPhone IMG_3553 montre le débordement à droite après ouverture du
tableau de comparaison. Reproduction automatisée : à 390 px et texte 200 %, la
page atteignait 1080 px. La piste automatique de la grille prenait la largeur
intrinsèque du tableau dans le details ouvert ; le graphique suivait cette
largeur agrandie. Les contrôles précédents s'arrêtaient avant l'ouverture.

La grille de simulation utilise désormais une piste minmax(0, 1fr), les details
peuvent rétrécir et la région de tableau est bornée à 100 %. Le tableau garde sa
largeur minimale et son défilement nommé ; aucune donnée, formule, référence de
capture ou tolérance de comparaison n'est modifiée. Aucun overflow-x:hidden.

Le test existant vérifie désormais la largeur du document et du conteneur après
ouverture des deux détails, à 320/390/768/1440 et dans les deux thèmes, avec texte
200 %. Les 10 parcours de comparaison passent sur Chromium149 local après
correction. Les captures synthétiques avant/après sont archivées au tag v1.11.0 :
phone et desktop, clair/sombre. Les quatre captures avant échouent à la nouvelle
assertion de largeur. Appareil iPhone réel et Safari/WebKit non disponibles ;
la recette physique reste nécessaire. Le signalement utilisateur reste propre
au téléphone, la couverture ordinateur/tablette est automatisée.

## Captures de revue

| Format     | Avant clair                                                                                                                  | Après clair                                                                                                                 | Avant sombre                                                                                                                | Après sombre                                                                                                               |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Téléphone  | [Avant](https://github.com/open-repos/cda-my-happy-wallet-frontend/blob/v1.11.0/docs/evidence/301/before-phone-light.webp)   | [Après](https://github.com/open-repos/cda-my-happy-wallet-frontend/blob/v1.11.0/docs/evidence/301/after-phone-light.webp)   | [Avant](https://github.com/open-repos/cda-my-happy-wallet-frontend/blob/v1.11.0/docs/evidence/301/before-phone-dark.webp)   | [Après](https://github.com/open-repos/cda-my-happy-wallet-frontend/blob/v1.11.0/docs/evidence/301/after-phone-dark.webp)   |
| Ordinateur | [Avant](https://github.com/open-repos/cda-my-happy-wallet-frontend/blob/v1.11.0/docs/evidence/301/before-desktop-light.webp) | [Après](https://github.com/open-repos/cda-my-happy-wallet-frontend/blob/v1.11.0/docs/evidence/301/after-desktop-light.webp) | [Avant](https://github.com/open-repos/cda-my-happy-wallet-frontend/blob/v1.11.0/docs/evidence/301/before-desktop-dark.webp) | [Après](https://github.com/open-repos/cda-my-happy-wallet-frontend/blob/v1.11.0/docs/evidence/301/after-desktop-dark.webp) |
