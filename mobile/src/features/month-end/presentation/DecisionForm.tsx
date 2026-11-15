import { useRouter } from "expo-router";
import { ReactNode, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

import { Button } from "@/src/design/Button";
import { FeedbackBanner } from "@/src/design/FeedbackState";
import {
  DecisionDraft,
  DecisionMode,
  DecisionPlan,
  FieldKey,
  MonthEndDecision,
  addMonths,
  buildDecisionPlan,
  draftFromDecision,
  emptyDraft,
  fillRest,
  monthName,
  ofMonth,
  previewCarry,
} from "@/src/features/month-end/domain/monthEnd";
import {
  DecisionCalculation,
  toneStyle,
} from "@/src/features/month-end/presentation/MonthEndParts";
import { monthEndStyles as styles } from "@/src/features/month-end/presentation/monthEndStyles";
import {
  SavingsAccount,
  formatVaultMoney,
} from "@/src/features/vault/domain/vault";
import { vaultStyles as shared } from "@/src/features/vault/presentation/vaultStyles";

type Describe = (amount: string, next: string) => string;
const SURPLUS_CHOICES: [DecisionMode, string, Describe][] = [
  [
    "carry",
    "Tout reporter",
    (amount, next) => `Les ${amount} s’ajoutent à ${next}.`,
  ],
  ["all", "Tout épargner", () => "Sur un ou plusieurs comptes du Coffre."],
  ["split", "Répartir", () => "Une partie en épargne, le reste reporté."],
];
const DEFICIT_CHOICES: [DecisionMode, string, Describe][] = [
  [
    "carry",
    "Tout reporter",
    (_, next) => `Le déficit réduit le reste à vivre de ${next}.`,
  ],
  [
    "cover",
    "Couvrir tout ou partie",
    () =>
      "Avec votre épargne et/ou une entrée exceptionnelle. Le reste est reporté.",
  ],
];

interface Props {
  decision: MonthEndDecision;
  accounts: SavingsAccount[];
  editing: boolean;
  busy: boolean;
  serverMessage: string | null;
  /** Écriture enregistrée mais affichage non relu (relecture à refaire). */
  notice: string | null;
  twoColumns: boolean;
  /** Retour, titre et état, au début de la zone qui défile. */
  header: ReactNode;
  onSubmit(plan: DecisionPlan): void;
  onCancel(): void;
}

/**
 * Formulaire « Décider » (#420, maquette validée le 11/11/2026) : aperçu du
 * report en centimes pendant la saisie, aperçu et validation collés en bas.
 * Le montant définitif est celui relu sur le serveur après validation.
 */
export const DecisionForm = ({
  decision,
  accounts,
  editing,
  busy,
  serverMessage,
  notice,
  twoColumns,
  header,
  onSubmit,
  onCancel,
}: Props) => {
  const router = useRouter();
  const result = decision.resultBeforeDecisionMinorUnits;
  const deficit = result < 0;
  const { currency, month } = decision;
  const next = monthName(addMonths(month, 1));
  const money = (value: number) => formatVaultMoney(value, currency);
  const [draft, setDraft] = useState<DecisionDraft>(() =>
    editing ? draftFromDecision(decision) : emptyDraft(),
  );
  const [showErrors, setShowErrors] = useState(false);
  const inputs = useRef(new Map<FieldKey, TextInput | null>());
  const built = buildDecisionPlan({ decision, editing, draft, accounts });
  const carry = previewCarry(result, built.plan);
  const choices = deficit ? DEFICIT_CHOICES : SURPLUS_CHOICES;

  const setAmount = (key: FieldKey, value: string) =>
    setDraft((current) =>
      key === "exceptional"
        ? { ...current, exceptional: value }
        : { ...current, amounts: { ...current.amounts, [key]: value } },
    );

  const submit = () => {
    if (busy) return;
    setShowErrors(true);
    if (built.errors.length > 0) {
      const first = (Object.keys(built.fieldErrors) as string[]).map((key) =>
        key === "exceptional" ? key : Number(key),
      )[0];
      AccessibilityInfo.announceForAccessibility(
        `La décision n’a pas été enregistrée : ${built.errors.join(" ")}`,
      );
      if (first !== undefined) inputs.current.get(first)?.focus();
      return;
    }
    onSubmit(built.plan);
  };

  const field = (
    key: FieldKey,
    label: string,
    hint: string,
    /** Compte sur lequel « Mettre le reste » est proposé. */
    restAccount: string | null,
  ) => {
    const error = showErrors ? built.fieldErrors[key] : undefined;
    const value =
      key === "exceptional" ? draft.exceptional : draft.amounts[key];
    return (
      <View key={key} style={styles.field}>
        <Text style={styles.label}>{label}</Text>
        <Text style={shared.help}>{hint}</Text>
        <View style={styles.money}>
          <TextInput
            ref={(input) => {
              inputs.current.set(key, input);
            }}
            accessibilityHint={hint}
            accessibilityLabel={label}
            aria-invalid={error !== undefined}
            autoComplete="off"
            editable={!busy}
            inputMode="decimal"
            keyboardType="decimal-pad"
            onChangeText={(text) => setAmount(key, text)}
            style={[styles.input, error !== undefined && styles.invalid]}
            value={value ?? ""}
          />
          <Text aria-hidden style={shared.text}>
            €
          </Text>
        </View>
        {error ? (
          <Text accessibilityLiveRegion="polite" style={shared.error}>
            {error}
          </Text>
        ) : null}
        {restAccount !== null && typeof key === "number" ? (
          <Pressable
            accessibilityLabel={`Mettre le reste sur ${restAccount}`}
            accessibilityRole="button"
            disabled={busy}
            onPress={() =>
              setAmount(key, fillRest(result, built.plan.savings, key))
            }
            style={({ pressed }) => [shared.link, pressed && shared.pressed]}
          >
            <Text style={shared.linkLabel}>Mettre le reste sur ce compte</Text>
          </Pressable>
        ) : null}
      </View>
    );
  };

  const sources =
    draft.mode === "carry" ? null : (
      <>
        <View style={shared.card}>
          <Text accessibilityRole="header" style={shared.cardTitle}>
            {deficit ? "Prélèvements d’épargne" : "Comptes du Coffre"}
          </Text>
          <Text style={shared.help}>
            {deficit
              ? `Un retrait vers le compte courant, daté du dernier jour ${ofMonth(month)}. Il n’est pas compté comme un revenu dans les Analyses.`
              : `Un virement du compte courant vers chaque compte, daté du dernier jour ${ofMonth(month)}. Il fait progresser l’objectif rattaché et n’est pas une dépense dans les Analyses.`}
          </Text>
          {accounts.length === 0 ? (
            <View style={styles.field}>
              <Text style={shared.text}>
                Aucun compte d’épargne dans cette devise.
              </Text>
              <Pressable
                accessibilityRole="link"
                onPress={() => router.push("/(app)/vault")}
                style={({ pressed }) => [
                  shared.link,
                  pressed && shared.pressed,
                ]}
              >
                <Text style={shared.linkLabel}>
                  Créer un compte dans le Coffre
                </Text>
              </Pressable>
            </View>
          ) : (
            accounts.map((account) =>
              field(
                account.id,
                `${deficit ? "Prélever sur" : "Épargner sur"} ${account.name}`,
                `Solde ${formatVaultMoney(
                  account.balanceMinorUnits,
                  account.currency,
                )}${account.archived ? " · compte archivé" : ""}`,
                !deficit && !account.archived ? account.name : null,
              ),
            )
          )}
        </View>
        {deficit ? (
          <View style={shared.card}>
            <Text accessibilityRole="header" style={shared.cardTitle}>
              Entrée exceptionnelle
            </Text>
            <Text style={shared.help}>
              {`Aide extérieure, remboursement… Elle appartient à ${monthName(month)} et apparaît dans les Analyses dans la catégorie « Entrée exceptionnelle », hors revenus habituels.`}
            </Text>
            {field(
              "exceptional",
              `Montant reçu pour couvrir ${monthName(month)}`,
              "Laissez vide si aucune",
              null,
            )}
          </View>
        ) : null}
      </>
    );

  const preview = (
    <View style={shared.card}>
      <Text accessibilityRole="header" style={shared.cardTitle}>
        Votre décision
      </Text>
      <DecisionCalculation
        accounts={accounts}
        decision={decision}
        plan={built.plan}
        preview
        previousCarry={editing ? decision.carryMinorUnits : null}
      />
      <Text style={shared.help}>
        Report = solde disponible − épargne + prélèvements d’épargne + entrée
        exceptionnelle. Aperçu indicatif : le montant définitif est confirmé
        après validation.
      </Text>
    </View>
  );

  const form = (
    <View style={twoColumns ? shared.column : styles.stack}>
      <View style={shared.card}>
        <View style={shared.row}>
          <Text style={shared.help}>
            {`${deficit ? "Déficit" : "Disponible"} fin ${monthName(month)}`}
          </Text>
          <Text
            style={[styles.tag, deficit ? styles.tagPending : styles.tagOk]}
          >
            {deficit ? "▼ Déficit" : "▲ Excédent"}
          </Text>
        </View>
        <Text style={[shared.bigAmount, toneStyle(result)]}>
          {money(result)}
        </Text>
        <Text style={shared.help}>Report du mois précédent inclus.</Text>
      </View>
      <View
        accessibilityLabel={
          deficit ? "Que faire du déficit ?" : "Que faire de ce solde ?"
        }
        accessibilityRole="radiogroup"
        style={styles.field}
      >
        <Text style={shared.sectionTitle}>
          {deficit ? "Que faire du déficit ?" : "Que faire de ce solde ?"}
        </Text>
        {choices.map(([value, label, describe]) => {
          const selected = draft.mode === value;
          const description = describe(money(Math.abs(result)), next);
          return (
            <Pressable
              key={value}
              accessibilityHint={description}
              accessibilityLabel={label}
              accessibilityRole="radio"
              accessibilityState={{ disabled: busy }}
              aria-checked={selected}
              disabled={busy}
              onPress={() =>
                setDraft((current) => ({ ...current, mode: value }))
              }
              style={[styles.choice, selected && styles.choiceSelected]}
            >
              <Text style={styles.label}>{label}</Text>
              <Text style={shared.help}>{description}</Text>
            </Pressable>
          );
        })}
      </View>
      {sources}
      {showErrors && built.errors.length > 0 ? (
        <View accessibilityRole="alert" style={styles.errors}>
          <Text style={[styles.errorText, styles.strong]}>
            La décision n’a pas été enregistrée :
          </Text>
          {built.errors.map((message) => (
            <Text key={message} style={styles.errorText}>
              {`• ${message}`}
            </Text>
          ))}
        </View>
      ) : null}
      {notice ? <FeedbackBanner kind="success">{notice}</FeedbackBanner> : null}
      {serverMessage ? (
        <FeedbackBanner kind="error">{serverMessage}</FeedbackBanner>
      ) : null}
      {twoColumns ? null : preview}
      <Text style={shared.help}>
        Besoin d’un virement à une autre date ? Faites un virement manuel depuis
        le Coffre.
      </Text>
      <Pressable
        accessibilityRole="link"
        onPress={() => router.push("/(app)/vault")}
        style={({ pressed }) => [shared.link, pressed && shared.pressed]}
      >
        <Text style={shared.linkLabel}>Ouvrir le Coffre</Text>
      </Pressable>
    </View>
  );

  return (
    <>
      <ScrollView
        contentContainerStyle={shared.content}
        keyboardShouldPersistTaps="handled"
        testID="month-end-form"
      >
        {header}
        {twoColumns ? (
          <View style={shared.columns}>
            {form}
            <View style={shared.column}>{preview}</View>
          </View>
        ) : (
          form
        )}
      </ScrollView>
      <View style={styles.footer} testID="month-end-footer">
        <View
          accessible
          accessibilityLabel={`Aperçu, ${
            carry < 0 ? "déficit reporté" : "report"
          } sur ${next} : ${money(carry)}`}
          accessibilityLiveRegion="polite"
          style={shared.row}
        >
          <Text style={shared.help}>
            {`Aperçu · ${carry < 0 ? "Déficit reporté sur " : "Report sur "}${next}`}
          </Text>
          <Text style={[shared.amount, toneStyle(carry)]}>{money(carry)}</Text>
        </View>
        <View style={shared.actions}>
          <Button
            disabled={busy}
            label={editing ? "Annuler" : "Plus tard"}
            onPress={onCancel}
            style={shared.grow}
          />
          <Button
            busy={busy}
            label="Valider la décision"
            onPress={submit}
            style={shared.grow}
            variant="primary"
          />
        </View>
      </View>
    </>
  );
};
