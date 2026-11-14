import Ionicons from "@expo/vector-icons/Ionicons";
import { Modal, Pressable, Text, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

import { BudgetSummary } from "@/src/features/budget/domain/budgetSummary";
import { calculationDetail } from "@/src/features/month-end/domain/calculationDetail";
import {
  MonthEndDecision,
  monthName,
  ofMonth,
} from "@/src/features/month-end/domain/monthEnd";
import { toneStyle } from "@/src/features/month-end/presentation/MonthEndParts";
import {
  monthEndColors as colors,
  monthEndStyles as styles,
} from "@/src/features/month-end/presentation/monthEndStyles";
import { formatVaultMoney } from "@/src/features/vault/domain/vault";
import { vaultStyles as shared } from "@/src/features/vault/presentation/vaultStyles";

/**
 * Feuille « Détail du calcul » du reste réel (#420). Les lignes « dont »
 * détaillent le report après la décision ; elles ne s'ajoutent pas au total.
 */
export const CalculationDetailSheet = ({
  summary,
  decision,
  onClose,
}: {
  summary: BudgetSummary;
  decision: MonthEndDecision | null;
  onClose(): void;
}) => {
  const detail = calculationDetail(summary, decision);
  const money = (value: number, signed: boolean) =>
    formatVaultMoney(value, summary.currency, signed);
  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible>
      {/* Une Modal Android a besoin de son propre fournisseur de marges. */}
      <SafeAreaProvider>
        <SafeAreaView edges={["bottom"]} style={styles.sheetLayer}>
          <View
            accessibilityViewIsModal
            style={styles.sheet}
            testID="calculation-detail"
          >
            <View style={shared.row}>
              <View style={shared.movementCopy}>
                <Text accessibilityRole="header" style={shared.cardTitle}>
                  Détail du calcul
                </Text>
                <Text style={shared.help}>
                  {`Reste réel de ${monthName(summary.month)}`}
                </Text>
              </View>
              <Pressable
                accessibilityLabel="Fermer le détail du calcul"
                accessibilityRole="button"
                onPress={onClose}
                style={styles.iconButton}
              >
                <Ionicons color={colors.textPrimary} name="close" size={28} />
              </Pressable>
            </View>
            <View style={styles.calc}>
              {detail.rows.map((row) => {
                const amount = money(
                  row.amountMinorUnits,
                  row.kind !== "total",
                );
                return (
                  <View
                    key={row.key}
                    accessible
                    accessibilityLabel={`${row.label} : ${amount}`}
                    style={[
                      styles.calcRow,
                      row.kind === "detail" && styles.calcDetail,
                      row.kind === "total" && styles.calcTotal,
                    ]}
                  >
                    <Text
                      style={[
                        row.kind === "detail"
                          ? styles.calcDetailText
                          : styles.calcLabel,
                        row.kind === "total" && styles.strong,
                      ]}
                    >
                      {row.label}
                    </Text>
                    <Text
                      style={[
                        row.kind === "detail"
                          ? styles.calcDetailText
                          : styles.calcAmount,
                        row.kind === "detail"
                          ? null
                          : toneStyle(row.amountMinorUnits),
                      ]}
                    >
                      {amount}
                    </Text>
                  </View>
                );
              })}
            </View>
            {detail.decided ? (
              <Text style={shared.help}>
                Les lignes « dont » expliquent le report après votre décision de
                fin de mois ; elles ne s’ajoutent pas une seconde fois.
              </Text>
            ) : null}
            {detail.pending && summary.carryFromMonth !== null ? (
              <Text style={shared.help}>
                {`Décision ${ofMonth(summary.carryFromMonth)} en attente : tout le solde est reporté.`}
              </Text>
            ) : null}
          </View>
        </SafeAreaView>
      </SafeAreaProvider>
    </Modal>
  );
};
