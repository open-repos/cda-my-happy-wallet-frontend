import { useMemo, useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from "react-native";

import { FeedbackBanner, FeedbackState } from "@/src/design/FeedbackState";
import { primitives, semantic, themes } from "@/src/design/tokens";
import { useAuth } from "@/src/features/auth/presentation/AuthProvider";
import { currentParisMonth } from "@/src/features/budget/domain/budgetSummary";
import {
  EventDraft,
  MonthlyEvent,
  recurrenceLabel,
} from "@/src/features/events/domain/monthlyEvent";
import { HttpMonthlyEventsGateway } from "@/src/features/events/infrastructure/HttpMonthlyEventsGateway";
import { MonthlyEventFormModal } from "@/src/features/events/presentation/MonthlyEventFormModal";
import {
  potentialExpiration,
  potentialMinStartDate,
} from "@/src/features/simulation/domain/potential";
import { useSimulation } from "@/src/features/simulation/presentation/SimulationContext";
import { usePotentialEvents } from "@/src/features/simulation/presentation/usePotentialEvents";

const useStyles = () => {
  const theme: keyof typeof themes =
    useColorScheme() === "dark" ? "dark" : "light";
  const colors = themes[theme].color;
  return { theme, colors, styles: useMemo(() => makeStyles(colors), [colors]) };
};
const semibold = `${primitives.fontWeight.semibold}` as "600";

type PendingAction =
  | { action: "confirm" | "delete"; event: MonthlyEvent }
  | { action: "clear" };
/** Formulaire ouvert : `null` pour un ajout, l'élément pour une modification. */
type EditedPotential = { event: MonthlyEvent | null };

const formatMoney = (amount: string, currency: string) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency }).format(
    Number(amount),
  );
const longDate = (date: string) =>
  new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00.000Z`));

/** Questions, boutons et messages repris du panneau Web. */
const CONFIRMATIONS = {
  confirm: (title: string) => ({
    question: `Confirmer ${title} comme événement prévu ?`,
    label: "Oui, confirmer",
    success:
      "Élément confirmé : il fait maintenant partie des prévisions habituelles.",
  }),
  delete: (title: string) => ({
    question: `Supprimer définitivement ${title} ?`,
    label: "Oui, supprimer",
    success: "Élément potentiel supprimé.",
  }),
  clear: () => ({
    question: "Supprimer définitivement tous les éléments potentiels ?",
    label: "Oui, vider la simulation",
    success: "Simulation vidée.",
  }),
};

const Button = ({
  label,
  accessibilityLabel,
  disabled,
  onPress,
  variant = "secondary",
}: {
  label: string;
  accessibilityLabel?: string;
  disabled: boolean;
  onPress(): void;
  variant?: "primary" | "secondary" | "danger";
}) => {
  const { styles } = useStyles();
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        styles[variant],
        disabled && styles.disabled,
        pressed && styles.pressed,
      ]}
    >
      <Text style={[styles.buttonLabel, styles[`${variant}Label`]]}>
        {label}
      </Text>
    </Pressable>
  );
};

const PotentialCard = ({
  event,
  busy,
  onAction,
  onEdit,
}: {
  event: MonthlyEvent;
  busy: boolean;
  onAction(action: "confirm" | "delete"): void;
  onEdit(): void;
}) => {
  const { styles } = useStyles();
  return (
    <View style={styles.potential}>
      <View style={styles.potentialHeading}>
        <Text accessibilityRole="header" style={styles.potentialTitle}>
          {event.title}
        </Text>
        <Text style={styles.badge}>Potentiel</Text>
      </View>
      <Text style={styles.help}>
        {event.kind === "DEPENSE" ? "Dépense" : "Entrée"} :{" "}
        {formatMoney(event.amount, event.currency)} ·{" "}
        {recurrenceLabel(event.recurrence)}
      </Text>
      <Text style={styles.help}>
        Date de début : {longDate(event.startDate)}
      </Text>
      <Text style={styles.help}>
        Expiration : à partir du{" "}
        {longDate(potentialExpiration(event.startDate))}, si non confirmé. Toute
        série récurrente expire selon son premier mois.
      </Text>
      {/* Ni réalisation ni annulation d'occurrence avant confirmation. */}
      <View style={styles.actions}>
        <Button
          accessibilityLabel={`Confirmer ${event.title}`}
          disabled={busy}
          label="Confirmer"
          onPress={() => onAction("confirm")}
          variant="primary"
        />
        <Button
          accessibilityLabel={`Modifier ${event.title}`}
          disabled={busy}
          label="Modifier"
          onPress={onEdit}
        />
        <Button
          accessibilityLabel={`Supprimer ${event.title}`}
          disabled={busy}
          label="Supprimer"
          onPress={() => onAction("delete")}
        />
      </View>
    </View>
  );
};

/**
 * Éléments potentiels de la Simulation (#241) et leurs commandes, chacune
 * confirmée dans le panneau (`Alert.alert` est sans effet sur le Web).
 * L'interrupteur et la comparaison (#240) restent en haut de l'écran.
 */
export const SimulationPanel = () => {
  const { styles, theme } = useStyles();
  const simulation = useSimulation();
  const { httpClient } = useAuth();
  const gateway = useMemo(
    () => new HttpMonthlyEventsGateway(httpClient),
    [httpClient],
  );
  const potentials = usePotentialEvents(gateway);
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [edited, setEdited] = useState<EditedPotential | null>(null);
  const busy = simulation.mutationStatus === "loading";

  const ask = (next: PendingAction) => {
    simulation.clearMessage();
    setEdited(null);
    setPending(next);
  };
  const openForm = (event: MonthlyEvent | null) => {
    simulation.clearMessage();
    setPending(null);
    setEdited({ event });
  };
  const confirmPending = async () => {
    if (pending == null) return;
    const copy =
      pending.action === "clear"
        ? CONFIRMATIONS.clear()
        : CONFIRMATIONS[pending.action](pending.event.title);
    const done = await simulation.mutate(
      () =>
        pending.action === "confirm"
          ? gateway.confirmPotentialEvent(pending.event.id)
          : pending.action === "delete"
            ? gateway.deleteEvent(pending.event.id)
            : gateway.clearPotentialEvents(),
      copy.success,
    );
    if (done) setPending(null);
  };
  const save = async (draft: EventDraft) => {
    const target = edited?.event ?? null;
    const done = await simulation.mutate(
      () =>
        target == null
          ? gateway.createPotentialEvent(draft)
          : gateway.updateEvent(target.id, draft),
      target == null
        ? "Élément potentiel enregistré. Activez la Simulation pour voir son effet."
        : "Élément potentiel modifié.",
    );
    if (done) setEdited(null);
  };
  const removeEdited = async () => {
    const target = edited?.event;
    if (target == null) return;
    if (
      await simulation.mutate(
        () => gateway.deleteEvent(target.id),
        "Élément potentiel supprimé.",
      )
    ) {
      setEdited(null);
    }
  };

  const pendingCopy =
    pending == null
      ? null
      : pending.action === "clear"
        ? CONFIRMATIONS.clear()
        : CONFIRMATIONS[pending.action](pending.event.title);

  return (
    <View style={styles.panel}>
      <Text accessibilityRole="header" style={styles.title}>
        Éléments potentiels
      </Text>
      <Text style={styles.help}>
        Hypothèses de la Simulation : elles ne comptent dans les prévisions
        qu’avec la Simulation, et jamais dans le réel.
      </Text>

      {/* Formulaire ouvert : le message s'affiche dans sa fenêtre. */}
      {simulation.message != null && edited == null ? (
        <FeedbackBanner
          theme={theme}
          kind={simulation.mutationStatus === "error" ? "error" : "success"}
        >
          {simulation.message}
        </FeedbackBanner>
      ) : null}

      {pending != null && pendingCopy != null ? (
        <View accessibilityRole="alert" style={styles.confirmation}>
          <Text style={styles.confirmationText}>{pendingCopy.question}</Text>
          <View style={styles.actions}>
            <Button
              accessibilityLabel="Annuler la confirmation"
              disabled={busy}
              label="Annuler"
              onPress={() => setPending(null)}
            />
            <Button
              disabled={busy}
              label={pendingCopy.label}
              onPress={() => void confirmPending()}
              variant={pending.action === "confirm" ? "primary" : "danger"}
            />
          </View>
        </View>
      ) : null}

      <View style={styles.actions}>
        <Button
          disabled={busy}
          label="Ajouter un élément potentiel"
          onPress={() => openForm(null)}
          variant="primary"
        />
        {potentials.status === "success" && potentials.events.length > 0 ? (
          <Button
            disabled={busy}
            label="Vider la simulation"
            onPress={() => ask({ action: "clear" })}
          />
        ) : null}
      </View>

      {potentials.status === "loading" ? (
        <FeedbackState
          theme={theme}
          description="Chargement des éléments potentiels…"
          framed={false}
          kind="loading"
          title="Chargement"
        />
      ) : null}
      {potentials.status === "error" ? (
        <FeedbackState
          theme={theme}
          actions={[
            {
              accessibilityLabel: "Réessayer les éléments potentiels",
              label: "Réessayer",
              onPress: potentials.retry,
            },
          ]}
          description="Les éléments potentiels n’ont pas pu être chargés."
          framed={false}
          kind="error"
          title="Éléments potentiels indisponibles"
        />
      ) : null}
      {potentials.status === "success" && potentials.events.length === 0 ? (
        <Text style={styles.help}>Votre simulation est vide.</Text>
      ) : null}
      {potentials.status === "success"
        ? potentials.events.map((event) => (
            <PotentialCard
              key={event.id}
              busy={busy}
              event={event}
              onAction={(action) => ask({ action, event })}
              onEdit={() => openForm(event)}
            />
          ))
        : null}

      {edited != null ? (
        <MonthlyEventFormModal
          key={edited.event?.id ?? "new"}
          errorMessage={
            simulation.mutationStatus === "error" ? simulation.message : null
          }
          event={edited.event}
          isSaving={busy}
          potential={{
            minStartDate: potentialMinStartDate(currentParisMonth()),
          }}
          visible
          onCancel={() => setEdited(null)}
          onDelete={() => void removeEdited()}
          onSave={(draft) => void save(draft)}
        />
      ) : null}
    </View>
  );
};

const makeStyles = (
  colors: typeof themes.light.color | typeof themes.dark.color,
) =>
  StyleSheet.create({
    panel: { gap: primitives.space["3"] },
    title: {
      color: colors.textPrimary,
      fontSize: primitives.fontSize.xl,
      fontWeight: semibold,
    },
    help: {
      color: colors.textSecondary,
      fontSize: primitives.fontSize.sm,
      lineHeight: 20,
    },
    actions: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: primitives.space["2"],
    },
    button: {
      alignItems: "center",
      borderRadius: semantic.radius.control,
      justifyContent: "center",
      minHeight: semantic.size.controlMinHeight,
      paddingHorizontal: semantic.space.controlInline,
    },
    primary: { backgroundColor: colors.actionPrimaryBackground },
    secondary: { backgroundColor: colors.actionSecondaryBackground },
    danger: { backgroundColor: colors.actionDangerBackground },
    buttonLabel: { fontSize: primitives.fontSize.md, fontWeight: semibold },
    primaryLabel: { color: colors.actionPrimaryText },
    secondaryLabel: { color: colors.actionSecondaryText },
    dangerLabel: { color: colors.actionDangerText },
    disabled: { opacity: 0.6 },
    pressed: { opacity: 0.8 },
    // Contour pointillé et libellé : un potentiel ne se confond pas avec un
    // événement prévu, même sans percevoir les couleurs.
    potential: {
      backgroundColor: colors.backgroundSurface,
      borderColor: colors.borderStrong,
      borderRadius: semantic.radius.card,
      borderStyle: "dashed",
      borderWidth: 2,
      gap: primitives.space["2"],
      padding: primitives.space["4"],
    },
    potentialHeading: {
      alignItems: "center",
      flexDirection: "row",
      flexWrap: "wrap",
      gap: primitives.space["2"],
      justifyContent: "space-between",
    },
    potentialTitle: {
      color: colors.textPrimary,
      flexShrink: 1,
      fontSize: primitives.fontSize.md,
      fontWeight: semibold,
    },
    badge: {
      borderColor: colors.borderStrong,
      borderRadius: semantic.radius.control,
      borderStyle: "dashed",
      borderWidth: semantic.borderWidth.default,
      color: colors.textPrimary,
      fontSize: primitives.fontSize.sm,
      fontWeight: semibold,
      paddingHorizontal: primitives.space["2"],
      paddingVertical: primitives.space["1"],
    },
    confirmation: {
      backgroundColor: colors.backgroundSurface,
      borderColor: colors.borderStrong,
      borderRadius: semantic.radius.card,
      borderWidth: semantic.borderWidth.default,
      gap: primitives.space["3"],
      padding: primitives.space["4"],
    },
    confirmationText: {
      color: colors.textPrimary,
      fontSize: primitives.fontSize.md,
      lineHeight: 22,
    },
  });
