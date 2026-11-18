import { Pressable, Text, View } from "react-native";

import {
  FinancialGoal,
  formatGoalMoney,
  goalPercent,
} from "@/src/features/goals/domain/financialGoal";
import { vaultStyles as styles } from "@/src/features/vault/presentation/vaultStyles";

interface Props {
  goal: FinancialGoal;
  onOpen(): void;
}

/**
 * Objectif rattaché à un compte du Coffre (#419). L'épargne affichée est
 * celle que le serveur déduit du solde du compte.
 */
export const VaultGoal = ({ goal, onOpen }: Props) => {
  const percent = goalPercent(goal);
  const text = `${percent} %`;
  return (
    <View style={{ gap: styles.card.gap }}>
      <View style={styles.row}>
        <Text style={styles.amount}>{goal.title}</Text>
        <Text style={styles.help}>{text}</Text>
      </View>
      <View
        accessible
        accessibilityLabel={`Progression de ${goal.title}`}
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max: 100, now: percent, text }}
        aria-valuemax={100}
        aria-valuemin={0}
        aria-valuenow={percent}
        aria-valuetext={text}
        style={styles.track}
      >
        <View style={[styles.fill, { width: `${percent}%` }]} />
      </View>
      <Text style={styles.help}>
        {formatGoalMoney(goal.savedAmount, goal.currency)} sur{" "}
        {formatGoalMoney(goal.targetAmount, goal.currency)}
      </Text>
      <Pressable
        accessibilityLabel={`Voir l’objectif ${goal.title}`}
        accessibilityRole="link"
        onPress={onOpen}
        style={({ pressed }) => [styles.link, pressed && styles.pressed]}
      >
        <Text style={styles.linkLabel}>Voir l’objectif</Text>
      </Pressable>
    </View>
  );
};
