import React, { forwardRef } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPlus,
  faPen,
  faTrash,
  faCheck,
  faTimes,
  faExchangeAlt,
  faCalculator,
  faUndo,
} from "@fortawesome/free-solid-svg-icons";
import { Button } from "./Button";
const actions = {
  add: { icon: faPlus, variant: "primary", label: "Ajouter" },
  edit: { icon: faPen, variant: "secondary", label: "Modifier" },
  delete: { icon: faTrash, variant: "danger", label: "Supprimer" },
  save: { icon: faCheck, variant: "primary", label: "Enregistrer" },
  cancel: { icon: faTimes, variant: "secondary", label: "Annuler" },
  convert: { icon: faExchangeAlt, variant: "primary", label: "Convertir" },
  simulate: { icon: faCalculator, variant: "secondary", label: "Simuler" },
  apply: { icon: faCheck, variant: "primary", label: "Appliquer" },
  reset: { icon: faUndo, variant: "secondary", label: "Réinitialiser" },
  confirm: { icon: faCheck, variant: "primary", label: "Confirmer" },
};
/** Existing application actions adapted to the generic button. */
export const ActionButton = forwardRef(function ActionButton(
  { action, variant, children, ...props },
  ref
) {
  const definition = actions[action];
  return (
    <Button
      {...props}
      ref={ref}
      variant={variant ?? definition.variant}
      icon={<FontAwesomeIcon icon={definition.icon} focusable="false" />}
    >
      {children ?? definition.label}
    </Button>
  );
});
