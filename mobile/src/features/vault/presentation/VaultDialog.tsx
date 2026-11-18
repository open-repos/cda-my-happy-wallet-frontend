import Ionicons from "@expo/vector-icons/Ionicons";
import { useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/src/design/Button";
import { FeedbackBanner } from "@/src/design/FeedbackState";
import { RadioGroup } from "@/src/design/RadioGroup";
import { primitives, semantic } from "@/src/design/tokens";
import {
  FinancialGoal,
  formatGoalMoney,
} from "@/src/features/goals/domain/financialGoal";
import { OperationDatePicker } from "@/src/features/operations/presentation/OperationDatePicker";
import {
  SavingsAccount,
  TransferAttempt,
  TransferDraft,
  eligibleGoals,
  formatVaultMoney,
  parseAmountInput,
  validateAccountDraft,
  validateAccountName,
  vaultToday,
} from "@/src/features/vault/domain/vault";
import { nextTransferAttempt } from "@/src/features/vault/domain/vaultWrite";
import { VaultGateway } from "@/src/features/vault/infrastructure/HttpVaultGateway";
import { useVaultMutation } from "@/src/features/vault/presentation/useVaultMutation";
import { VaultMovements } from "@/src/features/vault/presentation/VaultMovements";
import {
  vaultColors as colors,
  vaultStyles as shared,
} from "@/src/features/vault/presentation/vaultStyles";

export type VaultDialogRequest =
  | { mode: "create" }
  | { mode: "rename" | "archive" | "link"; account: SavingsAccount }
  | {
      mode: "transfer";
      account: SavingsAccount;
      direction: TransferDraft["direction"];
    };

interface Props {
  request: VaultDialogRequest;
  gateway: VaultGateway;
  goals: FinancialGoal[];
  /** Relit l'écran appelant ; `false` si la lecture a échoué. */
  refresh(): Promise<boolean>;
  /** `notice` : confirmation à afficher sur l'écran après la fermeture. */
  onClose(notice?: string): void;
}

type FieldErrors = Partial<
  Record<
    "name" | "currency" | "initialBalance" | "amount" | "date" | "goal",
    string
  >
>;

const TITLES = {
  create: "Créer un compte d’épargne",
  rename: "Renommer le compte",
  transfer: "Faire un virement",
  link: "Rattacher un objectif",
} as const;

/**
 * Formulaires plein écran du Coffre et confirmation d'archivage (#419,
 * maquette validée le 11/11/2026). Rien n'est calculé ici : après
 * l'enregistrement, l'écran appelant relit les soldes sur le serveur.
 */
export const VaultDialog = ({
  request,
  gateway,
  goals,
  refresh,
  onClose,
}: Props) => {
  const account = "account" in request ? request.account : null;
  const mutation = useVaultMutation(refresh);
  const [name, setName] = useState(
    request.mode === "rename" ? request.account.name : "",
  );
  const [currency, setCurrency] = useState("EUR");
  const [initialBalance, setInitialBalance] = useState("0");
  const [direction, setDirection] = useState<TransferDraft["direction"]>(
    request.mode === "transfer" ? request.direction : "deposit",
  );
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(() => vaultToday());
  const [goalId, setGoalId] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  // Tentative gardée après une réponse incertaine : même corps, même clé.
  const pending = useRef<TransferAttempt | null>(null);
  const [uncertain, setUncertain] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const locked = mutation.busy || uncertain;
  const choices =
    account === null ? [] : eligibleGoals(goals, account.currency);
  const deposit = direction === "deposit";
  const cents = parseAmountInput(amount);

  const save = async (write: () => Promise<unknown>, success: string) => {
    const outcome = await mutation.run(write, success);
    if (outcome?.status === "saved") onClose(outcome.message);
    return outcome;
  };

  const submit = async () => {
    if (mutation.busy) return;
    if (request.mode === "create") {
      const draft = validateAccountDraft({ name, currency, initialBalance });
      setErrors(draft.ok ? {} : draft.errors);
      if (draft.ok)
        await save(() => gateway.create(draft.value), "Compte créé.");
    } else if (request.mode === "rename") {
      const error = validateAccountName(name);
      setErrors(error === null ? {} : { name: error });
      if (error === null) {
        await save(
          () => gateway.rename(request.account.id, name.trim()),
          "Compte renommé.",
        );
      }
    } else if (request.mode === "archive") {
      await save(() => gateway.archive(request.account.id), "Compte archivé.");
    } else if (request.mode === "link") {
      const goal = choices.find((item) => `${item.id}` === goalId);
      setErrors(
        goal
          ? {}
          : { goal: "Choisissez un objectif disponible dans la même devise." },
      );
      if (goal) {
        await save(
          () => gateway.linkGoal(request.account.id, goal.id),
          "Objectif rattaché.",
        );
      }
    } else {
      const attempt = nextTransferAttempt(
        pending.current,
        { direction, amount, date },
        vaultToday(),
      );
      setErrors(attempt.ok ? {} : attempt.errors);
      if (!attempt.ok) return;
      pending.current = attempt.value;
      const outcome = await save(
        () => gateway.transfer(request.account.id, attempt.value),
        "Virement enregistré.",
      );
      if (outcome?.status === "uncertain") setUncertain(true);
      // Pendant une reprise, seul un refus métier connu libère la clé : un
      // refus sans code (proxy, délai) ne dit rien du premier envoi.
      if (
        outcome?.status === "refused" &&
        (!uncertain || outcome.code !== null)
      ) {
        pending.current = null;
        setUncertain(false);
        setVerifying(false);
      }
    }
  };

  const submitLabel =
    request.mode === "create"
      ? "Créer le compte"
      : request.mode === "rename"
        ? "Enregistrer"
        : request.mode === "archive"
          ? "Archiver le compte"
          : request.mode === "link"
            ? "Rattacher"
            : uncertain
              ? "Reprendre ce virement"
              : `${deposit ? "Déposer" : "Retirer"}${
                  account !== null && cents !== null && cents > 0
                    ? ` ${formatVaultMoney(cents, account.currency)}`
                    : ""
                }`;

  const field = (
    key: keyof FieldErrors,
    label: string,
    value: string,
    onChangeText: (value: string) => void,
    props: Partial<React.ComponentProps<typeof TextInput>> = {},
  ) => (
    <View>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        aria-invalid={errors[key] != null}
        editable={!locked}
        onChangeText={(next) => {
          onChangeText(next);
          setErrors((current) => ({ ...current, [key]: undefined }));
        }}
        style={[styles.input, errors[key] != null && styles.invalid]}
        value={value}
        {...props}
      />
      {errors[key] ? (
        <Text accessibilityLiveRegion="polite" style={shared.error}>
          {errors[key]}
        </Text>
      ) : null}
    </View>
  );

  const close = () => onClose();

  return (
    <Modal
      animationType="slide"
      // Retour Android ou Échap pendant l'écriture : le formulaire reste,
      // sinon une réponse perdue ferait oublier la tentative et sa clé.
      onRequestClose={() => {
        if (!mutation.busy) close();
      }}
      visible
    >
      {/* Une Modal Android a besoin de son propre fournisseur de marges. */}
      <SafeAreaProvider>
        <SafeAreaView edges={["top", "bottom"]} style={styles.flex}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={styles.flex}
          >
            <ScrollView
              testID="vault-dialog"
              contentContainerStyle={styles.content}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.header}>
                <View style={styles.heading}>
                  <Text accessibilityRole="header" style={styles.title}>
                    {request.mode === "archive"
                      ? `Archiver « ${request.account.name} » ?`
                      : TITLES[request.mode]}
                  </Text>
                  {request.mode === "create" ? (
                    <Text style={shared.help}>
                      Déclarez l’épargne que vous souhaitez suivre dans le
                      Coffre.
                    </Text>
                  ) : null}
                  {request.mode === "transfer" ? (
                    <Text style={shared.help}>
                      {`Compte « ${request.account.name} » · solde ${formatVaultMoney(
                        request.account.balanceMinorUnits,
                        request.account.currency,
                      )}`}
                    </Text>
                  ) : null}
                  {request.mode === "rename" || request.mode === "link" ? (
                    <Text style={shared.help}>
                      {request.mode === "link"
                        ? `${request.account.name} · objectifs en ${request.account.currency} sans compte.`
                        : `${request.account.name} · ${request.account.currency}`}
                    </Text>
                  ) : null}
                </View>
                <Pressable
                  accessibilityLabel="Fermer le formulaire"
                  accessibilityRole="button"
                  disabled={mutation.busy}
                  onPress={close}
                  style={styles.iconButton}
                >
                  <Ionicons color={colors.textPrimary} name="close" size={28} />
                </Pressable>
              </View>

              {mutation.failure ? (
                <FeedbackBanner kind="error">{mutation.failure}</FeedbackBanner>
              ) : null}

              {request.mode === "create" || request.mode === "rename"
                ? field("name", "Nom du compte", name, setName, {
                    autoFocus: true,
                    maxLength: 100,
                  })
                : null}
              {request.mode === "create" ? (
                <>
                  {field("currency", "Devise", currency, setCurrency, {
                    autoCapitalize: "characters",
                    autoCorrect: false,
                    maxLength: 3,
                  })}
                  {field(
                    "initialBalance",
                    "Solde initial",
                    initialBalance,
                    setInitialBalance,
                    { keyboardType: "decimal-pad" },
                  )}
                  <View style={shared.notice}>
                    <Text style={shared.noticeText}>
                      Le solde initial représente une épargne déjà constituée.
                      Il ne débite pas votre budget disponible. Vous pourrez
                      ensuite rattacher un objectif au compte.
                    </Text>
                  </View>
                </>
              ) : null}

              {request.mode === "transfer" ? (
                <>
                  <Text style={styles.label}>Sens du virement</Text>
                  <RadioGroup<TransferDraft["direction"]>
                    choices={[
                      { value: "deposit", label: "Déposer" },
                      { value: "withdraw", label: "Retirer" },
                    ]}
                    disabled={locked}
                    label="Sens du virement"
                    onChange={setDirection}
                    value={direction}
                  />
                  {field(
                    "amount",
                    deposit ? "Montant à déposer" : "Montant à retirer",
                    amount,
                    setAmount,
                    { autoFocus: true, keyboardType: "decimal-pad" },
                  )}
                  <View>
                    <Text style={styles.label}>Date du virement</Text>
                    <OperationDatePicker
                      disabled={locked}
                      invalid={errors.date != null}
                      label="Date du virement"
                      onChange={(next) => {
                        setDate(next);
                        setErrors((current) => ({
                          ...current,
                          date: undefined,
                        }));
                      }}
                      value={date}
                    />
                    {errors.date ? (
                      <Text
                        accessibilityLiveRegion="polite"
                        style={shared.error}
                      >
                        {errors.date}
                      </Text>
                    ) : null}
                  </View>
                  <View accessibilityLiveRegion="polite" style={shared.notice}>
                    <Text style={shared.noticeText}>
                      {deposit
                        ? "Impact du dépôt. Le montant quitte votre budget disponible et rejoint ce compte d’épargne. Ce virement ne comptera pas comme une dépense dans les Analyses."
                        : "Impact du retrait. Le montant quitte ce compte d’épargne et rejoint votre budget disponible. Ce virement ne comptera pas comme un revenu dans les Analyses."}{" "}
                      Les soldes sont mis à jour après l’enregistrement.
                    </Text>
                  </View>
                  {uncertain ? (
                    <View style={styles.uncertain}>
                      <Text style={shared.noticeText}>
                        Les champs sont conservés pour reprendre exactement ce
                        virement. Vérifiez les mouvements, puis utilisez «
                        Reprendre ce virement » : cette reprise ne créera pas de
                        doublon.
                      </Text>
                      <Button
                        disabled={mutation.busy}
                        label={
                          verifying
                            ? "Masquer les mouvements"
                            : "Vérifier les mouvements"
                        }
                        onPress={() => setVerifying((value) => !value)}
                      />
                      {verifying ? (
                        <VaultMovements
                          gateway={gateway}
                          target={{ accountId: request.account.id }}
                        />
                      ) : null}
                    </View>
                  ) : null}
                </>
              ) : null}

              {request.mode === "link" ? (
                <>
                  {choices.length > 0 ? (
                    <RadioGroup
                      choices={choices.map((goal) => ({
                        value: `${goal.id}`,
                        label: `${goal.title} · ${formatGoalMoney(
                          goal.savedAmount,
                          goal.currency,
                        )} déjà épargnés`,
                      }))}
                      disabled={locked}
                      label="Objectif à rattacher"
                      onChange={(next) => {
                        setGoalId(next);
                        setErrors({});
                      }}
                      value={goalId}
                    />
                  ) : (
                    <Text style={shared.text}>
                      Aucun objectif disponible dans cette devise. Créez un
                      objectif dans « Objectifs ».
                    </Text>
                  )}
                  {errors.goal ? (
                    <Text accessibilityLiveRegion="polite" style={shared.error}>
                      {errors.goal}
                    </Text>
                  ) : null}
                  <Text style={shared.help}>
                    Une fois rattaché, l’objectif suit le solde de ce compte et
                    ne peut pas être détaché. Un objectif qui a déjà de
                    l’épargne demande un compte vierge, sans solde initial ni
                    mouvement.
                  </Text>
                </>
              ) : null}

              {request.mode === "archive" ? (
                <Text style={shared.text}>
                  Le compte quitte la liste des comptes actifs. Son solde et son
                  historique sont conservés et restent consultables dans «
                  Archivés ». Il ne pourra plus recevoir de virement, et il ne
                  peut pas être restauré.
                </Text>
              ) : null}

              <View style={styles.actions}>
                <Button
                  disabled={mutation.busy}
                  label={uncertain ? "Fermer sans reprendre" : "Annuler"}
                  onPress={close}
                />
                <Button
                  busy={mutation.busy}
                  disabled={request.mode === "link" && choices.length === 0}
                  label={submitLabel}
                  onPress={() => void submit()}
                  variant={request.mode === "archive" ? "danger" : "primary"}
                />
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </SafeAreaProvider>
    </Modal>
  );
};

const semibold = `${primitives.fontWeight.semibold}` as "600";
const styles = StyleSheet.create({
  flex: { backgroundColor: colors.backgroundSurface, flex: 1 },
  content: {
    alignSelf: "center",
    gap: primitives.space["4"],
    maxWidth: primitives.size.contentMd,
    padding: primitives.space["6"],
    width: "100%",
  },
  header: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: primitives.space["3"],
    justifyContent: "space-between",
  },
  heading: { flex: 1, gap: primitives.space["1"] },
  title: {
    color: colors.textPrimary,
    fontSize: primitives.fontSize.xl,
    fontWeight: semibold,
  },
  iconButton: {
    alignItems: "center",
    height: semantic.size.controlMinHeight,
    justifyContent: "center",
    width: semantic.size.controlMinHeight,
  },
  label: {
    color: colors.textPrimary,
    fontSize: primitives.fontSize.sm,
    fontWeight: semibold,
    marginBottom: primitives.space["2"],
  },
  input: {
    backgroundColor: colors.fieldBackground,
    borderColor: colors.fieldBorder,
    borderRadius: semantic.radius.control,
    borderWidth: semantic.borderWidth.default,
    color: colors.fieldText,
    fontSize: primitives.fontSize.md,
    minHeight: semantic.size.controlMinHeight,
    paddingHorizontal: semantic.space.controlInline,
  },
  invalid: {
    borderColor: colors.statusErrorText,
    borderWidth: semantic.borderWidth.focus,
  },
  uncertain: {
    backgroundColor: colors.statusWarningSurface,
    borderRadius: semantic.radius.control,
    gap: primitives.space["3"],
    padding: primitives.space["3"],
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: primitives.space["2"],
    justifyContent: "flex-end",
    marginTop: primitives.space["4"],
  },
});
