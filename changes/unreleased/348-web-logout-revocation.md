---
type: fixed
issue: 348
user: Se déconnecter ferme aussi la session sur le serveur : elle ne peut plus être reprise depuis cet appareil.
---

Web logout now calls `POST /users/logout` to revoke the refresh session and clear its cookies; the local sign-out does not wait for the response.
