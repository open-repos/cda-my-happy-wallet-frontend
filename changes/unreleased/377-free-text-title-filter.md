---
type: changed
issue: 377
user: Le filtre Libellé applique maintenant le texte que vous tapez, sans obliger à choisir une suggestion.
---

The Libellé column filter of the one-off and fixed operation tables now applies the typed text as a « contains » filter on Enter or when leaving the field, through the new `freeText` option of `FilterCombobox`; suggestions remain available.
