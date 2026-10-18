---
type: fixed
issue: 96
user: Votre session n'est plus interrompue sans raison quand plusieurs actions se déroulent en même temps.
---

Shared one Web token refresh between concurrent requests and stopped sending protected requests with an expired access token when the refresh is refused, so an expired session no longer rotates the same refresh token several times or signs users out unexpectedly.
