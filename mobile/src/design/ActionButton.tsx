import { ComponentProps, forwardRef } from "react";
import { View } from "react-native";
import { Button } from "./Button";
const actions = {
  add: { icon: "add" as const, label: "Ajouter", variant: "primary" as const },
  edit: {
    icon: "create-outline" as const,
    label: "Modifier",
    variant: "secondary" as const,
  },
  delete: {
    icon: "trash-outline" as const,
    label: "Supprimer",
    variant: "danger" as const,
  },
};
type Props = Omit<ComponentProps<typeof Button>, "label"> & {
  action: keyof typeof actions;
  label?: string;
};
export const ActionButton = forwardRef<View, Props>(function ActionButton(
  { action, label, variant, ...props },
  ref,
) {
  const choice = actions[action];
  return (
    <Button
      {...props}
      ref={ref}
      label={label ?? choice.label}
      variant={variant ?? choice.variant}
      icon={choice.icon}
    />
  );
});
