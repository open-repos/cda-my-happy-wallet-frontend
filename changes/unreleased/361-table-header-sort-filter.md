---
type: changed
issue: 361
user: Triez et filtrez vos opérations et vos charges fixes directement depuis le nom des colonnes ; sur téléphone, le bouton « Trier et filtrer » regroupe ces réglages.
---

Replaced the separate sort selects and loaded-items search with sortable, filterable column headers on the one-off and fixed operation tables. One-off operations are sorted and filtered by the API (#165) with title suggestions (#174) and restart from the first page; fixed operations stay sorted and filtered in the browser. Sort and filters are kept in the URL, and a « Trier et filtrer » panel gives every sort criterion and, below 64rem, every filter.
