import { Text, View } from "react-native";

import { Button } from "@/src/design/Button";
import { FeedbackBanner } from "@/src/design/FeedbackState";
import {
  occurrenceKey,
  occurrenceTexts,
} from "@/src/features/vault/domain/savingsOccurrence";
import { SavingsOccurrences } from "@/src/features/vault/presentation/useSavingsOccurrences";
import { vaultStyles as styles } from "@/src/features/vault/presentation/vaultStyles";

/**
 * Versements mensuels à confirmer (#425) : « Confirmer le virement » crée le
 * virement, « Ne pas verser » libère la réserve, définitivement pour le mois.
 * Rien n'est affiché sans versement ni message.
 */
export const SavingsOccurrenceList = ({
  occurrences,
  title,
  intro,
}: {
  occurrences: SavingsOccurrences;
  title: string;
  intro?: string;
}) => {
  const { items, busy, failure, notice, resolve } = occurrences;
  if (items.length === 0 && !failure && !notice) return null;
  return (
    <View style={styles.card} testID="savings-occurrences">
      <Text accessibilityRole="header" style={styles.cardTitle}>
        {items.length > 0 ? `${title} (${items.length})` : title}
      </Text>
      {intro && items.length > 0 ? (
        <Text style={styles.help}>{intro}</Text>
      ) : null}
      {notice ? <FeedbackBanner kind="success">{notice}</FeedbackBanner> : null}
      {failure ? <FeedbackBanner kind="error">{failure}</FeedbackBanner> : null}
      {items.map((occurrence) => {
        const texts = occurrenceTexts(occurrence);
        return (
          <View key={occurrenceKey(occurrence)} style={styles.stack}>
            <Text style={styles.amount}>{texts.title}</Text>
            <Text style={styles.help}>{texts.detail}</Text>
            <View style={styles.actions}>
              <Button
                accessibilityLabel={texts.confirm}
                busy={busy}
                label="Confirmer le virement"
                onPress={() => void resolve(occurrence, "CONFIRMED")}
                style={styles.grow}
                variant="primary"
              />
              <Button
                accessibilityLabel={texts.skip}
                disabled={busy}
                label="Ne pas verser"
                onPress={() => void resolve(occurrence, "CANCELED")}
                style={styles.grow}
              />
            </View>
          </View>
        );
      })}
      {items.length > 0 ? (
        <Text style={styles.help}>
          Refuser est définitif pour ce mois : la réserve prévue est libérée.
        </Text>
      ) : null}
    </View>
  );
};
