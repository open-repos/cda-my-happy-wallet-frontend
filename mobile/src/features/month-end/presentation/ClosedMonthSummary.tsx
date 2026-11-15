import { useRouter } from "expo-router";
import { Text, View } from "react-native";

import { Button } from "@/src/design/Button";
import {
  BudgetSummary,
  toCents,
} from "@/src/features/budget/domain/budgetSummary";
import { ofMonth } from "@/src/features/month-end/domain/monthEnd";
import { closedMonthCard } from "@/src/features/month-end/domain/pendingItems";
import { monthEndStyles as styles } from "@/src/features/month-end/presentation/monthEndStyles";
import { formatVaultMoney } from "@/src/features/vault/domain/vault";
import { vaultStyles as shared } from "@/src/features/vault/presentation/vaultStyles";

const Row = ({ label, value }: { label: string; value: string }) => (
  <View
    accessible
    accessibilityLabel={`${label} : ${value}`}
    style={styles.calcRow}
  >
    <Text style={styles.calcLabel}>{label}</Text>
    <Text style={styles.calcAmount}>{value}</Text>
  </View>
);

/**
 * Résumé d'un mois clos du calendrier (#425, maquette « Calendrier ») :
 * résultat, report entrant et décision de fin de mois du résumé serveur.
 * Rien pour le mois courant ou un mois futur.
 */
export const ClosedMonthSummary = ({ summary }: { summary: BudgetSummary }) => {
  const router = useRouter();
  const card = closedMonthCard(summary.month, summary.monthEndDecision ?? null);
  if (card === null) return null;
  const money = (cents: number) =>
    formatVaultMoney(cents, summary.currency, true);
  return (
    <View style={shared.card} testID="closed-month-summary">
      <View style={shared.row}>
        <Text accessibilityRole="header" style={shared.cardTitle}>
          Résumé du mois
        </Text>
        <Text style={[styles.tag, styles.tagNeutral]}>Mois clos</Text>
      </View>
      <View style={styles.calc}>
        <Row
          label="Résultat du mois"
          value={money(toCents(summary.monthResult))}
        />
        {summary.carryFromMonth !== null ? (
          <Row
            label={`Report ${ofMonth(summary.carryFromMonth)}`}
            value={money(toCents(summary.carryIn))}
          />
        ) : null}
      </View>
      <View style={shared.row}>
        <Text accessibilityRole="header" style={shared.amount}>
          Décision de fin de mois
        </Text>
        <Text
          style={[
            styles.tag,
            card.status === "decided" ? styles.tagOk : styles.tagPending,
          ]}
        >
          {card.tag}
        </Text>
      </View>
      <Text style={shared.text}>{card.text}</Text>
      {card.rows.length > 0 ? (
        <View style={styles.calc}>
          {card.rows.map(([label, value]) => (
            <Row key={label} label={label} value={value} />
          ))}
        </View>
      ) : null}
      <Button
        label={card.action}
        onPress={() =>
          router.push({
            pathname: "/(app)/month-end",
            params: { mois: summary.month },
          })
        }
        variant={card.status === "decided" ? "secondary" : "primary"}
      />
    </View>
  );
};
