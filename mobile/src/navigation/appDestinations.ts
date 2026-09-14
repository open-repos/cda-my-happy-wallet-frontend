export type AppRouteName =
  | "index"
  | "calendar"
  | "goals"
  | "operations"
  | "profile";

export type AppIconName =
  | "calendar"
  | "calendar-outline"
  | "grid"
  | "grid-outline"
  | "list"
  | "list-outline"
  | "person"
  | "person-outline"
  | "radio-button-on"
  | "radio-button-on-outline";

export type AppDestination = Readonly<{
  route: AppRouteName;
  label: string;
  accessibilityLabel: string;
  icon: AppIconName;
  activeIcon: AppIconName;
}>;

export const APP_DESTINATIONS = [
  {
    route: "index",
    label: "Accueil",
    accessibilityLabel: "Tableau de bord",
    icon: "grid-outline",
    activeIcon: "grid",
  },
  {
    route: "calendar",
    label: "Calendrier",
    accessibilityLabel: "Calendrier",
    icon: "calendar-outline",
    activeIcon: "calendar",
  },
  {
    route: "goals",
    label: "Objectifs",
    accessibilityLabel: "Objectifs et événements",
    icon: "radio-button-on-outline",
    activeIcon: "radio-button-on",
  },
  {
    route: "operations",
    label: "Opérations",
    accessibilityLabel: "Opérations ponctuelles",
    icon: "list-outline",
    activeIcon: "list",
  },
  {
    route: "profile",
    label: "Profil",
    accessibilityLabel: "Profil utilisateur",
    icon: "person-outline",
    activeIcon: "person",
  },
] as const satisfies readonly AppDestination[];
