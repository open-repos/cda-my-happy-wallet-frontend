import Ionicons from "@expo/vector-icons/Ionicons";
import {
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

import { BudgetSummary } from "@/src/features/budget/domain/budgetSummary";
import { calculationDetail } from "@/src/features/month-end/domain/calculationDetail";
import {
  MonthEndDecision,
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
 * Feuille « Détail du calcul » de l'Accueil : du théorique à l'actualisé
 * (#393, maquette C), puis la comparaison par jour. Les lignes « dont » de
 * #420 détaillent le report après la décision ; elles ne s'ajoutent pas.
 * Le contenu défile, le titre et « Fermer » restent visibles.
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
  const { height } = useWindowDimensions();
  const detail = calculationDetail(summary, decision);
  const { perDay } = detail;
  const money = (value: number, signed: boolean) =>
    formatVaultMoney(value, summary.currency, signed);
  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible>
      {/* Une Modal Android a besoin de son propre fournisseur de marges. */}
      <SafeAreaProvider>
        <SafeAreaView edges={["bottom"]} style={styles.sheetLayer}>
          <View
            accessibilityViewIsModal
            style={[styles.sheet, { maxHeight: height * 0.9 }]}
            testID="calculation-detail"
          >
            <View style={shared.row}>
              <View style={shared.movementCopy}>
                <Text accessibilityRole="header" style={shared.cardTitle}>
                  Détail du calcul
                </Text>
                <Text style={shared.help}>Du théorique à l’actualisé</Text>
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
            <ScrollView
              contentContainerStyle={styles.sheetList}
              style={styles.sheetScroll}
              testID="calculation-detail-content"
            >
              <Text style={shared.help}>
                Chaque ligne reprend une valeur du résumé calculé par le
                serveur.
              </Text>
              <View style={styles.calc}>
                {detail.rows.map((row) => {
                  const amount = money(
                    row.amountMinorUnits,
                    row.kind === "line" || row.kind === "detail",
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
                          row.kind !== "line" &&
                            row.kind !== "detail" &&
                            styles.strong,
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
                  Les lignes « dont » expliquent le report après votre décision
                  de fin de mois ; elles ne s’ajoutent pas une seconde fois.
                </Text>
              ) : null}
              {detail.pending && summary.carryFromMonth !== null ? (
                <Text style={shared.help}>
                  {`Décision ${ofMonth(summary.carryFromMonth)} en attente : tout le solde est reporté.`}
                </Text>
              ) : null}

              <Text accessibilityRole="header" style={shared.amount}>
                Par jour
              </Text>
              <View style={styles.perDay} testID="calculation-per-day">
                {perDay.actual ? (
                  <View
                    accessible
                    accessibilityLabel={`Aujourd’hui, actualisé : ${perDay.actual.amount}, ${perDay.actual.help}`}
                    style={[styles.perDayValue, styles.perDayActual]}
                  >
                    <Text style={shared.help}>Aujourd’hui (actualisé)</Text>
                    <Text style={styles.perDayAmount}>
                      {perDay.actual.amount}
                    </Text>
                    <Text style={shared.help}>{perDay.actual.help}</Text>
                  </View>
                ) : null}
                <View
                  accessible
                  accessibilityLabel={`Théorique : ${perDay.theoretical.amount}, ${perDay.theoretical.help}`}
                  style={styles.perDayValue}
                >
                  <Text style={shared.help}>Théorique</Text>
                  <Text style={styles.perDayAmount}>
                    {perDay.theoretical.amount}
                  </Text>
                  <Text style={shared.help}>{perDay.theoretical.help}</Text>
                </View>
              </View>
            </ScrollView>
          </View>
        </SafeAreaView>
      </SafeAreaProvider>
    </Modal>
  );
};
