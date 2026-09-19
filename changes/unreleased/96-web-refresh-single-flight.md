## Fixed

- Mutualise le renouvellement du jeton Web entre les requêtes concurrentes afin
  qu'une expiration de session ne provoque plus plusieurs rotations du même
  refresh token ni une déconnexion injustifiée.
- Interrompt les requêtes protégées lorsque le renouvellement est refusé, au
  lieu de les envoyer avec un jeton d'accès expiré.
