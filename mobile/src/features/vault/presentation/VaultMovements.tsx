import { useCallback } from "react";
import { Text, View } from "react-native";

import { Button } from "@/src/design/Button";
import { FeedbackState } from "@/src/design/FeedbackState";
import { longDate } from "@/src/features/envelopes/presentation/envelopeFormat";
import { usePagedCollection } from "@/src/features/envelopes/presentation/usePagedCollection";
import {
  CurrentMovement,
  currentMovementLabels,
  formatVaultMoney,
  savingsMovementLabels,
  signedMovementAmount,
} from "@/src/features/vault/domain/vault";
import { VaultGateway } from "@/src/features/vault/infrastructure/HttpVaultGateway";
import { vaultStyles as styles } from "@/src/features/vault/presentation/vaultStyles";

export type MovementsTarget =
  | { accountId: number }
  | { month: string; currency: string };

interface Row {
  key: string;
  title: string;
  detail: string;
  amount: string;
}

const loadedMessage = (count: number) =>
  `${count} mouvement${count > 1 ? "s" : ""} chargé${count > 1 ? "s" : ""}.`;
const currentIdentity = (row: CurrentMovement) => row.key;

type Paged = Pick<
  ReturnType<typeof usePagedCollection>,
  "status" | "hasNext" | "paging" | "pagingError" | "loadMore" | "retry"
>;

const MovementList = ({ list, rows }: { list: Paged; rows: Row[] }) => (
  <View
    accessibilityState={{ busy: list.status === "loading" || list.paging }}
    style={styles.card}
  >
    <Text accessibilityRole="header" style={styles.cardTitle}>
      Mouvements
    </Text>
    {list.status === "loading" ? (
      <FeedbackState
        description="Chargement des mouvements…"
        framed={false}
        kind="loading"
        title="Chargement"
      />
    ) : null}
    {list.status === "error" ? (
      <FeedbackState
        actions={[
          {
            accessibilityLabel: "Réessayer les mouvements",
            label: "Réessayer",
            onPress: list.retry,
          },
        ]}
        description="Impossible de charger les mouvements. Vérifiez votre connexion puis réessayez."
        framed={false}
        kind="error"
        title="Mouvements indisponibles"
      />
    ) : null}
    {list.status === "success" && rows.length === 0 ? (
      <Text style={styles.help}>Aucun mouvement sur cette période.</Text>
    ) : null}
    {list.status === "success"
      ? rows.map((row, index) => (
          <View
            accessible
            key={row.key}
            style={[styles.movement, index === 0 && styles.firstMovement]}
          >
            <View style={styles.movementCopy}>
              <Text style={styles.text}>{row.title}</Text>
              <Text style={styles.help}>{row.detail}</Text>
            </View>
            <Text style={styles.amount}>{row.amount}</Text>
          </View>
        ))
      : null}
    {list.status === "success" && list.hasNext ? (
      <Button
        busy={list.paging}
        label="Afficher plus de mouvements"
        onPress={list.loadMore}
      />
    ) : null}
    {list.pagingError ? (
      <Text accessibilityRole="alert" style={styles.error}>
        La suite des mouvements n’a pas pu être chargée. Réessayez.
      </Text>
    ) : null}
  </View>
);

const SavingsMovements = ({
  accountId,
  gateway,
}: {
  accountId: number;
  gateway: VaultGateway;
}) => {
  const load = useCallback(
    (cursor: string | null) => gateway.movements(accountId, cursor),
    [accountId, gateway],
  );
  const list = usePagedCollection(load, loadedMessage);
  return (
    <MovementList
      list={list}
      rows={list.rows.map((row) => {
        const labels = savingsMovementLabels(row);
        return {
          key: `${row.id}`,
          title: labels.title,
          detail: `${labels.kind} · ${longDate(row.operationDate)}`,
          amount: formatVaultMoney(
            signedMovementAmount(row),
            row.currency,
            true,
          ),
        };
      })}
    />
  );
};

const CurrentMovements = ({
  currency,
  gateway,
  month,
}: {
  currency: string;
  gateway: VaultGateway;
  month: string;
}) => {
  const load = useCallback(
    (cursor: string | null) =>
      gateway.currentMovements(month, currency, cursor),
    [currency, gateway, month],
  );
  const list = usePagedCollection(load, loadedMessage, currentIdentity);
  return (
    <MovementList
      list={list}
      rows={list.rows.map((row) => ({
        key: row.key,
        title: row.title,
        detail: `${currentMovementLabels(row)} · ${longDate(row.operationDate)}`,
        amount: formatVaultMoney(
          row.signedAmountMinorUnits,
          row.currency,
          true,
        ),
      }))}
    />
  );
};

/**
 * Mouvements paginés d'un compte d'épargne ou du compte courant (#419).
 * Montants signés fournis par le serveur, jamais recalculés.
 */
export const VaultMovements = ({
  gateway,
  target,
}: {
  gateway: VaultGateway;
  target: MovementsTarget;
}) =>
  "accountId" in target ? (
    <SavingsMovements accountId={target.accountId} gateway={gateway} />
  ) : (
    <CurrentMovements
      currency={target.currency}
      gateway={gateway}
      month={target.month}
    />
  );
