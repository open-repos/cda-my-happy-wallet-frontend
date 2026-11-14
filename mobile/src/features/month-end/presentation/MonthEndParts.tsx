import { ReactNode } from "react";
import { Text, View } from "react-native";

import {
  DecisionPlan,
  MonthEndDecision,
  addMonths,
  carryBeforeCorrection,
  monthName,
  ofMonth,
  previewCarry,
} from "@/src/features/month-end/domain/monthEnd";
import { monthEndStyles as styles } from "@/src/features/month-end/presentation/monthEndStyles";
import {
  SavingsAccount,
  formatVaultMoney,
} from "@/src/features/vault/domain/vault";
import { vaultStyles as shared } from "@/src/features/vault/presentation/vaultStyles";

export const toneStyle = (value: number) =>
  value < 0 ? styles.negative : value > 0 ? styles.positive : null;

export const accountLabel = (
  accounts: readonly SavingsAccount[],
  accountId: number,
) =>
  accounts.find((account) => account.id === accountId)?.name ??
  `Compte n° ${accountId}`;

/** Correction après décision : l'épargne ne change jamais, seul le report. */
export const ReviewNotice = ({
  decision,
  children,
}: {
  decision: MonthEndDecision;
  children?: ReactNode;
}) => {
  const money = (value: number, signed = false) =>
    formatVaultMoney(value, decision.currency, signed);
  const saved = decision.savingsMinorUnits;
  return (
    <View style={[styles.banner, styles.warning]} testID="month-end-review">
      <Text accessibilityRole="header" style={styles.bannerTitle}>
        {`À revoir : ${monthName(decision.month)} a changé après votre décision`}
      </Text>
      <Text style={shared.text}>
        {`Une opération modifiée après la décision change le solde de ${money(
          decision.correctionDeltaMinorUnits,
          true,
        )}. ${
          saved > 0
            ? `Votre épargne reste à ${money(saved)} ; seul le report change : `
            : "Votre répartition est conservée ; seul le report change : "
        }`}
        <Text style={styles.strong}>
          {`${money(carryBeforeCorrection(decision))} → ${money(
            decision.carryMinorUnits,
          )}`}
        </Text>
        .
      </Text>
      {children}
    </View>
  );
};

const Row = ({
  label,
  hint,
  amount,
  amountStyle,
  previous,
  total = false,
}: {
  label: string;
  hint?: string;
  amount: string;
  amountStyle?: object | null;
  previous?: string | null;
  total?: boolean;
}) => (
  <View
    accessible
    accessibilityLabel={`${label}${hint ? `, ${hint}` : ""} : ${
      previous ? `${previous} avant correction, désormais ` : ""
    }${amount}`}
    style={[styles.calcRow, total && styles.calcTotal]}
  >
    <Text style={[styles.calcLabel, total && styles.strong]}>
      {label}
      {hint ? <Text style={styles.calcHint}>{`\n${hint}`}</Text> : null}
    </Text>
    <Text style={[styles.calcAmount, amountStyle]}>
      {previous ? <Text style={styles.previous}>{`${previous} `}</Text> : null}
      {amount}
    </Text>
  </View>
);

/**
 * Cascade lisible sans la couleur : signes explicites et libellés
 * « Épargne », « Prélèvement », « Report » ou « Déficit reporté ».
 */
export const DecisionCalculation = ({
  decision,
  plan,
  accounts,
  preview = false,
  previousCarry = null,
}: {
  decision: MonthEndDecision;
  plan: DecisionPlan;
  accounts: readonly SavingsAccount[];
  preview?: boolean;
  previousCarry?: number | null;
}) => {
  const { currency, month } = decision;
  const result = decision.resultBeforeDecisionMinorUnits;
  const carry = previewCarry(result, plan);
  const deficit = result < 0;
  const money = (value: number, signed = false) =>
    formatVaultMoney(value, currency, signed);
  const next = monthName(addMonths(month, 1));
  return (
    <View style={styles.calc}>
      <Row
        amount={money(result)}
        amountStyle={toneStyle(result)}
        hint={`report ${ofMonth(addMonths(month, -1))} inclus`}
        label={`${deficit ? "Déficit" : "Disponible"} fin ${monthName(month)}`}
      />
      {deficit
        ? plan.coverage.map((row) => (
            <Row
              key={`c${row.accountId}`}
              amount={money(row.amountMinorUnits, true)}
              label={`Prélèvement sur ${accountLabel(accounts, row.accountId)}`}
            />
          ))
        : plan.savings.map((row) => (
            <Row
              key={`s${row.accountId}`}
              amount={money(-row.amountMinorUnits, true)}
              label={`Épargne vers ${accountLabel(accounts, row.accountId)}`}
            />
          ))}
      {deficit && plan.exceptionalIncomeMinorUnits > 0 ? (
        <Row
          amount={money(plan.exceptionalIncomeMinorUnits, true)}
          label="Entrée exceptionnelle"
        />
      ) : null}
      <Row
        amount={money(carry)}
        amountStyle={toneStyle(carry)}
        label={`${preview ? "Aperçu · " : ""}${
          carry < 0 ? "Déficit reporté sur " : "Report sur "
        }${next}`}
        previous={
          previousCarry !== null && previousCarry !== carry
            ? money(previousCarry)
            : null
        }
        total
      />
    </View>
  );
};
