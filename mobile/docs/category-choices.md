# Choix de catégorie natif — #291

ChoiceList est une primitive de radios générique : valeur, libellés et rendu
initial injectés, aucun appel réseau ni mutation. CategoryChoices adapte les
catégories personnelles au CategoryMark existant ; OperationFormModal et
RealizeOccurrenceModal la réutilisent. Les icônes retirées ou absentes gardent le
fallback de l'application. Les listes restent toujours ouvertes, donc aucun
sélecteur imbriqué ou nouveau piège de focus n'est introduit.

Les états cochés utilisent aria-checked selon les règles du dépôt ; les options
désactivées et les erreurs sont accessibles. Cibles 48 dp, textes multilignes et
icônes non réductibles. Le thème système pilote les formulaires concernés et les
couleurs de repli de CategoryMark. La sélection conserve le brouillon et n'écrit
rien. Les formulaires d'événement et du budget fixe natif n'exposent actuellement
aucune catégorie ; aucun champ/API n'est inventé dans ce correctif.

Validation : type-check, format, lint, 233 tests, Expo Doctor 20/20 et export Web.
Parcours export des radios, icône/fallback, état choisi et ajout rapide ; fixtures
synthétiques. Les captures produites par les tests ne sont pas de nouvelles
références. Les seuils historiques restent intacts. Le development build
Android/iOS, les grandes polices système et VoiceOver/TalkBack restent à recetter
sur appareil : un export Web ne remplace pas ces contrôles.
