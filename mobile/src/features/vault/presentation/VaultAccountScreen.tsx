import Ionicons from "@expo/vector-icons/Ionicons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ReactNode, useCallback, useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/src/design/Button";
import { FeedbackBanner, FeedbackState } from "@/src/design/FeedbackState";
import { TAB_SCREEN_EDGES } from "@/src/design/safeArea";
import { primitives } from "@/src/design/tokens";
import { useAuth } from "@/src/features/auth/presentation/AuthProvider";
import { monthLabel } from "@/src/features/envelopes/presentation/envelopeFormat";
import { HttpFinancialGoalsGateway } from "@/src/features/goals/infrastructure/HttpFinancialGoalsGateway";
import { useFabClearance } from "@/src/features/quick-add/presentation/useFabClearance";
import {
  BUDGET_LABELS,
  formatVaultMoney,
  shiftMonth,
  vaultToday,
} from "@/src/features/vault/domain/vault";
import {
  HttpVaultGateway,
  VaultGateway,
} from "@/src/features/vault/infrastructure/HttpVaultGateway";
import { useVaultValue } from "@/src/features/vault/presentation/useVaultValue";
import {
  VaultDialog,
  VaultDialogRequest,
} from "@/src/features/vault/presentation/VaultDialog";
import { VaultGoal } from "@/src/features/vault/presentation/VaultGoal";
import { VaultMovements } from "@/src/features/vault/presentation/VaultMovements";
import {
  VAULT_TWO_COLUMNS,
  vaultColors as colors,
  vaultStyles as styles,
} from "@/src/features/vault/presentation/vaultStyles";

const positiveId = (value: string | string[] | undefined) =>
  typeof value === "string" && /^[1-9]\d{0,14}$/.test(value)
    ? Number(value)
    : null;
const currencyOf = (value: string | string[] | undefined) =>
  typeof value === "string" && /^[A-Z]{3}$/.test(value) ? value : "EUR";

const Frame = ({ children }: { children: ReactNode }) => {
  // Fin de page dégagée du bouton flottant d’ajout (#407).
  const fabSpace = useFabClearance(primitives.space["16"]);
  const router = useRouter();
  return (
    <SafeAreaView
      edges={TAB_SCREEN_EDGES}
      style={styles.safeArea}
      testID="vault-account-screen"
    >
      <ScrollView contentContainerStyle={[styles.content, fabSpace]}>
        <Pressable
          accessibilityRole="link"
          onPress={() => router.navigate("/(app)/vault")}
          style={({ pressed }) => [styles.backLink, pressed && styles.pressed]}
        >
          <Ionicons
            color={colors.actionSecondaryText}
            name="chevron-back"
            size={20}
          />
          <Text style={styles.backLabel}>Retour au Coffre</Text>
        </Pressable>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
};

const useTwoColumns = () => useWindowDimensions().width >= VAULT_TWO_COLUMNS;

/** Budget disponible d'un mois passé ou courant et ses mouvements. */
const CurrentAccountView = ({
  currency,
  gateway,
}: {
  currency: string;
  gateway: VaultGateway;
}) => {
  const currentMonth = vaultToday().slice(0, 7);
  const [month, setMonth] = useState(currentMonth);
  const load = useCallback(
    () => gateway.current(month, currency),
    [currency, gateway, month],
  );
  const current = useVaultValue(load);
  const previous = shiftMonth(month, -1, currentMonth);
  const next = shiftMonth(month, 1, currentMonth);
  const twoColumns = useTwoColumns();
  const value = current.value;

  return (
    <Frame>
      <Text style={styles.eyebrow}>Compte courant</Text>
      <Text accessibilityRole="header" style={styles.title}>
        Budget disponible
      </Text>
      <Text style={styles.lead}>
        {`${monthLabel(month)} · ${currency}. Ce montant vient de votre budget ; il ne représente pas un solde bancaire connecté.`}
      </Text>
      <View style={styles.actions}>
        <Button
          disabled={previous === null}
          icon="chevron-back"
          label="Mois précédent"
          onPress={() => previous !== null && setMonth(previous)}
          style={styles.grow}
        />
        <Button
          disabled={next === null}
          icon="chevron-forward"
          label="Mois suivant"
          onPress={() => next !== null && setMonth(next)}
          style={styles.grow}
        />
      </View>
      {current.status === "loading" ? (
        <FeedbackState
          description="Chargement du budget disponible…"
          kind="loading"
          title="Chargement"
        />
      ) : null}
      {current.status === "error" ? (
        <FeedbackState
          actions={[
            {
              accessibilityLabel: "Réessayer le budget disponible",
              label: "Réessayer",
              onPress: current.retry,
            },
          ]}
          description="Vos données n’ont pas été modifiées. Vérifiez votre connexion puis réessayez."
          kind="error"
          title="Budget disponible indisponible"
        />
      ) : null}
      <View style={styles.columns}>
        {value ? (
          <View style={[styles.card, twoColumns ? styles.half : styles.full]}>
            <View style={styles.row}>
              <Text style={styles.text}>Disponible</Text>
              <Text style={styles.bigAmount}>
                {formatVaultMoney(value.balanceMinorUnits, value.currency)}
              </Text>
            </View>
            {BUDGET_LABELS.map(([key, label]) => (
              <View key={key} style={styles.row}>
                <Text style={styles.help}>{label}</Text>
                <Text style={styles.amount}>
                  {formatVaultMoney(value.budget[key], value.currency)}
                </Text>
              </View>
            ))}
          </View>
        ) : null}
        <View style={twoColumns ? styles.half : styles.full}>
          <VaultMovements gateway={gateway} target={{ month, currency }} />
        </View>
      </View>
    </Frame>
  );
};

/** Compte d'épargne : solde, actions, mouvements et objectif rattaché. */
const SavingsAccountView = ({
  accountId,
  gateway,
}: {
  accountId: number;
  gateway: VaultGateway;
}) => {
  const router = useRouter();
  const { httpClient } = useAuth();
  const goalsGateway = useMemo(
    () => new HttpFinancialGoalsGateway(httpClient),
    [httpClient],
  );
  const loadAccount = useCallback(
    () => gateway.account(accountId),
    [accountId, gateway],
  );
  const read = useVaultValue(loadAccount);
  const loadGoals = useCallback(
    () => goalsGateway.listAllGoals(),
    [goalsGateway],
  );
  const goals = useVaultValue(loadGoals);
  const [dialog, setDialog] = useState<VaultDialogRequest | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const twoColumns = useTwoColumns();

  const { reload: reloadAccount } = read;
  const { reload: reloadGoals } = goals;
  const refresh = useCallback(
    async () =>
      (await Promise.all([reloadAccount(), reloadGoals()])).every(Boolean),
    [reloadAccount, reloadGoals],
  );
  const open = (request: VaultDialogRequest) => {
    setNotice(null);
    setDialog(request);
  };

  const account = read.value;
  const goal = goals.value?.find((item) => item.id === account?.goalId);

  return (
    <Frame>
      <Text style={styles.eyebrow}>Compte d’épargne</Text>
      <Text accessibilityRole="header" style={styles.title}>
        {account?.name ?? "Compte"}
      </Text>
      {read.status === "loading" ? (
        <FeedbackState
          description="Chargement du compte…"
          kind="loading"
          title="Chargement"
        />
      ) : null}
      {read.status === "error" ? (
        <FeedbackState
          actions={[
            {
              accessibilityLabel: "Réessayer le compte",
              label: "Réessayer",
              onPress: read.retry,
            },
          ]}
          description="Vos données n’ont pas été modifiées. Vérifiez votre connexion puis réessayez."
          kind="error"
          title="Compte indisponible"
        />
      ) : null}
      {account ? (
        <>
          <Text style={styles.lead}>
            {account.currency} · {account.archived ? "Archivé" : "Actif"}
          </Text>
          {notice ? (
            <FeedbackBanner kind="success">{notice}</FeedbackBanner>
          ) : null}
          <View style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.text}>Solde actuel</Text>
              <Text style={styles.bigAmount}>
                {formatVaultMoney(account.balanceMinorUnits, account.currency)}
              </Text>
            </View>
            {account.archived ? (
              <Text style={styles.help}>
                Compte archivé : le solde et l’historique restent consultables.
                Aucun nouveau virement n’est possible.
              </Text>
            ) : (
              <>
                <View style={styles.actions}>
                  <Button
                    icon="arrow-down"
                    label="Déposer"
                    onPress={() =>
                      open({ mode: "transfer", account, direction: "deposit" })
                    }
                    style={styles.grow}
                    variant="primary"
                  />
                  <Button
                    icon="arrow-up"
                    label="Retirer"
                    onPress={() =>
                      open({ mode: "transfer", account, direction: "withdraw" })
                    }
                    style={styles.grow}
                  />
                </View>
                <View style={styles.actions}>
                  <Button
                    icon="create-outline"
                    label="Renommer"
                    onPress={() => open({ mode: "rename", account })}
                    style={styles.grow}
                  />
                  <Button
                    label="Archiver"
                    onPress={() => open({ mode: "archive", account })}
                    style={styles.grow}
                    variant="danger"
                  />
                </View>
              </>
            )}
          </View>
          <View style={styles.columns}>
            <View style={twoColumns ? styles.half : styles.full}>
              <VaultMovements
                gateway={gateway}
                target={{ accountId: account.id }}
              />
            </View>
            <View
              style={[styles.column, twoColumns ? styles.half : styles.full]}
            >
              <View style={styles.card}>
                <Text accessibilityRole="header" style={styles.cardTitle}>
                  Objectif rattaché
                </Text>
                {goal ? (
                  <VaultGoal
                    goal={goal}
                    onOpen={() => router.push("/(app)/goals")}
                  />
                ) : account.goalId !== null ? (
                  <Text style={styles.help}>
                    {goals.status === "success"
                      ? "L’objectif n’est plus disponible. Actualisez les données."
                      : "Objectif rattaché : actualisez les données pour afficher sa progression."}
                  </Text>
                ) : (
                  <>
                    <Text style={styles.help}>Aucun objectif rattaché.</Text>
                    {!account.archived ? (
                      <Button
                        disabled={goals.status !== "success"}
                        label="Rattacher un objectif"
                        onPress={() => open({ mode: "link", account })}
                      />
                    ) : null}
                  </>
                )}
                <Text style={styles.help}>
                  La progression suit le solde réel du compte.
                </Text>
              </View>
              <View style={styles.card}>
                <Text accessibilityRole="header" style={styles.cardTitle}>
                  À propos du compte
                </Text>
                <View style={styles.row}>
                  <Text style={styles.help}>Solde initial</Text>
                  <Text style={styles.amount}>
                    {formatVaultMoney(
                      account.initialBalanceMinorUnits,
                      account.currency,
                    )}
                  </Text>
                </View>
                <View style={styles.row}>
                  <Text style={styles.help}>Devise</Text>
                  <Text style={styles.amount}>{account.currency}</Text>
                </View>
              </View>
            </View>
          </View>
        </>
      ) : null}
      {dialog ? (
        <VaultDialog
          gateway={gateway}
          goals={goals.value ?? []}
          onClose={(message) => {
            setDialog(null);
            if (message) setNotice(message);
          }}
          refresh={refresh}
          request={dialog}
        />
      ) : null}
    </Frame>
  );
};

/**
 * Détail du Coffre (#419) : `?compte=<id>` ouvre un compte d'épargne,
 * `?compte=current` le budget disponible. L'écran reste monté sous les
 * onglets : la clé repart d'un état neuf quand le compte change, et une
 * réponse de l'ancien compte est ignorée.
 */
export const VaultAccountScreen = () => {
  const params = useLocalSearchParams<{ compte?: string; devise?: string }>();
  const { httpClient } = useAuth();
  const gateway = useMemo(() => new HttpVaultGateway(httpClient), [httpClient]);
  const accountId = positiveId(params.compte);
  const currency = currencyOf(params.devise);

  if (params.compte === "current") {
    return (
      <CurrentAccountView
        currency={currency}
        gateway={gateway}
        key={`current:${currency}`}
      />
    );
  }
  if (accountId !== null) {
    return (
      <SavingsAccountView
        accountId={accountId}
        gateway={gateway}
        key={accountId}
      />
    );
  }
  return (
    <Frame>
      <Text accessibilityRole="header" style={styles.title}>
        Compte
      </Text>
      <FeedbackState
        description="Ce lien ne désigne aucun compte. Revenez au Coffre pour en choisir un."
        kind="error"
        title="Compte introuvable"
      />
    </Frame>
  );
};
