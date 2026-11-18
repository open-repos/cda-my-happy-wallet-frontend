import { useRouter } from "expo-router";
import { Pressable, Text, View } from "react-native";

import { Button } from "@/src/design/Button";
import {
  HomeMonthEnd,
  capitalize,
  monthLabel,
  monthName,
  ofMonth,
  previewCarry,
  planOf,
} from "@/src/features/month-end/domain/monthEnd";
import { ReviewNotice } from "@/src/features/month-end/presentation/MonthEndParts";
import { monthEndStyles as styles } from "@/src/features/month-end/presentation/monthEndStyles";
import { formatVaultMoney } from "@/src/features/vault/domain/vault";
import { vaultStyles as shared } from "@/src/features/vault/presentation/vaultStyles";

/**
 * Proposition de l'Accueil (#420) : bandeau à partir du premier jour du mois
 * suivant, rappel après « Plus tard », avertissement « À revoir » ou décision
 * à jour. Rien n'est affiché sans lecture réussie.
 */
export const MonthEndHomeSection = ({
  state,
  onPostpone,
}: {
  state: HomeMonthEnd;
  onPostpone(): void;
}) => {
  const router = useRouter();
  if (state.kind === "none") return null;
  const { decision } = state;
  const open = () =>
    router.push({
      pathname: "/(app)/month-end",
      params: { mois: decision.month },
    });
  const money = (value: number) => formatVaultMoney(value, decision.currency);
  const result = decision.resultBeforeDecisionMinorUnits;
  const deficit = result < 0;
  const link = (label: string, accessibilityLabel = label) => (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="link"
      onPress={open}
      style={({ pressed }) => [shared.link, pressed && shared.pressed]}
    >
      <Text style={shared.linkLabel}>{label}</Text>
    </Pressable>
  );

  if (state.kind === "review") {
    return (
      <ReviewNotice decision={decision}>
        <Button
          label={`Revoir la décision ${ofMonth(decision.month)}`}
          onPress={open}
          variant="primary"
        />
      </ReviewNotice>
    );
  }

  if (state.kind === "decided") {
    const carry = previewCarry(result, planOf(decision));
    const moved = deficit
      ? `${money(
          decision.coverageMinorUnits + decision.exceptionalIncomeMinorUnits,
        )} couverts`
      : `${money(decision.savingsMinorUnits)} épargnés`;
    return (
      <View style={styles.reminder} testID="month-end-decided">
        <Text style={styles.reminderText}>
          {`Décision ${ofMonth(decision.month)} à jour : ${moved}, ${money(carry)} reportés.`}
        </Text>
        {link(
          "Voir la décision",
          `Voir la décision ${ofMonth(decision.month)}`,
        )}
      </View>
    );
  }

  if (state.kind === "reminder") {
    return (
      <View style={styles.reminder} testID="month-end-reminder">
        <Text style={styles.reminderText}>
          {`Décision ${ofMonth(decision.month)} en attente · ${money(result)} ${
            deficit ? "de déficit reporté" : "reportés"
          } pour l’instant.`}
        </Text>
        {link("Décider maintenant")}
      </View>
    );
  }

  const name = monthName(decision.month);
  return (
    <View style={styles.banner} testID="month-end-prompt">
      <Text style={shared.eyebrow}>
        {`Fin de mois · ${monthLabel(decision.month)}`}
      </Text>
      <Text accessibilityRole="header" style={styles.bannerTitle}>
        {deficit
          ? `${capitalize(name)} se termine avec un déficit de ${money(-result)}`
          : `Il vous reste ${money(result)} ${ofMonth(decision.month)}`}
      </Text>
      <Text style={shared.text}>
        {`${
          deficit
            ? "Voulez-vous le couvrir avec votre épargne ou une entrée exceptionnelle ?"
            : "Voulez-vous le reporter, l’épargner, ou répartir entre les deux ?"
        } Report du mois précédent inclus. Sans réponse, ${
          deficit
            ? "le déficit reste reporté et réduit votre reste à vivre de ce mois."
            : "tout reste reporté et s’ajoute à votre reste à vivre de ce mois."
        }`}
      </Text>
      <View style={shared.actions}>
        <Button
          label={deficit ? "Couvrir ou reporter" : "Décider maintenant"}
          onPress={open}
          style={shared.grow}
          variant="primary"
        />
        <Button label="Plus tard" onPress={onPostpone} style={shared.grow} />
      </View>
    </View>
  );
};
