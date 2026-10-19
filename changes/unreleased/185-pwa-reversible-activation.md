---
type: fixed
issue: 185
user: Les graphiques continuent de s'afficher dans un onglet resté ouvert pendant une mise à jour du site.
---

Kept the previous release's hashed assets available after a deployment and added an explicit rollback build that unregisters the service worker and deletes its public caches, so the PWA can be enabled in production and withdrawn safely.
