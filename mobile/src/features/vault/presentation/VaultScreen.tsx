import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
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
import { RadioGroup } from "@/src/design/RadioGroup";
import { TAB_SCREEN_EDGES } from "@/src/design/safeArea";
import { primitives } from "@/src/design/tokens";
import { useAuth } from "@/src/features/auth/presentation/AuthProvider";
import { monthLabel } from "@/src/features/envelopes/presentation/envelopeFormat";
import { usePagedCollection } from "@/src/features/envelopes/presentation/usePagedCollection";
import { HttpFinancialGoalsGateway } from "@/src/features/goals/infrastructure/HttpFinancialGoalsGateway";
import { useFabClearance } from "@/src/features/quick-add/presentation/useFabClearance";
import {
  SavingsAccount,
  formatVaultMoney,
  vaultToday,
} from "@/src/features/vault/domain/vault";
import { HttpVaultGateway } from "@/src/features/vault/infrastructure/HttpVaultGateway";
import { useVaultValue } from "@/src/features/vault/presentation/useVaultValue";
import {
  VaultDialog,
  VaultDialogRequest,
} from "@/src/features/vault/presentation/VaultDialog";
import { VaultGoal } from "@/src/features/vault/presentation/VaultGoal";
import {
  VAULT_TWO_COLUMNS,
  vaultColors as colors,
  vaultStyles as styles,
} from "@/src/features/vault/presentation/vaultStyles";

const loadedMessage = (count: number) =>
  `${count} compte${count > 1 ? "s" : ""} chargé${count > 1 ? "s" : ""}.`;

/**
 * Coffre mobile (#419, maquette validée le 11/11/2026) : budget disponible
 * du compte courant et comptes d'épargne. Route secondaire ouverte depuis
 * l'Accueil ; tous les montants sont ceux du serveur.
 */
export const VaultScreen = () => {
  // Fin de page dégagée du bouton flottant d’ajout (#407).
  const fabSpace = useFabClearance(primitives.space["16"]);
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { httpClient } = useAuth();
  const gateway = useMemo(() => new HttpVaultGateway(httpClient), [httpClient]);
  const goalsGateway = useMemo(
    () => new HttpFinancialGoalsGateway(httpClient),
    [httpClient],
  );
  const [view, setView] = useState<"active" | "archived">("active");
  const [currency, setCurrency] = useState("EUR");
  const [dialog, setDialog] = useState<VaultDialogRequest | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const month = vaultToday().slice(0, 7);

  const loadAccounts = useCallback(
    (cursor: string | null) => gateway.accounts(cursor),
    [gateway],
  );
  const accounts = usePagedCollection(loadAccounts, loadedMessage);
  const loadCurrent = useCallback(
    () => gateway.current(month, currency),
    [currency, gateway, month],
  );
  const current = useVaultValue(loadCurrent);
  const loadGoals = useCallback(
    () => goalsGateway.listAllGoals(),
    [goalsGateway],
  );
  const goals = useVaultValue(loadGoals);

  const { reload: reloadAccounts } = accounts;
  const { reload: reloadCurrent } = current;
  const { reload: reloadGoals } = goals;
  const refresh = useCallback(
    async () =>
      (
        await Promise.all([reloadAccounts(), reloadCurrent(), reloadGoals()])
      ).every(Boolean),
    [reloadAccounts, reloadCurrent, reloadGoals],
  );

  const open = (request: VaultDialogRequest) => {
    setNotice(null);
    setDialog(request);
  };
  const openAccount = (compte: string) =>
    router.push({
      pathname: "/(app)/vault-account",
      params: { compte, devise: currency },
    });

  const currencies = [
    ...new Set(["EUR", ...accounts.rows.map((account) => account.currency)]),
  ];
  const visible = accounts.rows.filter(
    (account) => account.archived === (view === "archived"),
  );
  const twoColumns = width >= VAULT_TWO_COLUMNS;

  const renderAccount = (account: SavingsAccount) => {
    const goal = goals.value?.find((item) => item.id === account.goalId);
    return (
      <View
        key={account.id}
        style={[styles.card, twoColumns ? styles.half : styles.full]}
      >
        <View style={styles.row}>
          <Text accessibilityRole="header" style={styles.cardTitle}>
            {account.name}
          </Text>
          <Text style={styles.help}>
            {account.currency} · {account.archived ? "Archivé" : "Actif"}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.help}>Solde</Text>
          <Text style={styles.amount}>
            {formatVaultMoney(account.balanceMinorUnits, account.currency)}
          </Text>
        </View>
        {goal ? (
          <VaultGoal goal={goal} onOpen={() => router.push("/(app)/goals")} />
        ) : account.goalId !== null ? (
          <Text style={styles.help}>
            Objectif rattaché : actualisez les données pour afficher sa
            progression.
          </Text>
        ) : (
          <>
            <Text style={styles.help}>Aucun objectif rattaché.</Text>
            {!account.archived ? (
              <Button
                accessibilityLabel={`Rattacher un objectif à ${account.name}`}
                disabled={goals.status !== "success"}
                label="Rattacher un objectif"
                onPress={() => open({ mode: "link", account })}
              />
            ) : null}
          </>
        )}
        {!account.archived ? (
          <View style={styles.actions}>
            <Button
              accessibilityLabel={`Déposer sur ${account.name}`}
              icon="arrow-down"
              label="Déposer"
              onPress={() =>
                open({ mode: "transfer", account, direction: "deposit" })
              }
              style={styles.grow}
              variant="primary"
            />
            <Button
              accessibilityLabel={`Retirer de ${account.name}`}
              icon="arrow-up"
              label="Retirer"
              onPress={() =>
                open({ mode: "transfer", account, direction: "withdraw" })
              }
              style={styles.grow}
            />
          </View>
        ) : null}
        <Pressable
          accessibilityLabel={`Voir le compte ${account.name}`}
          accessibilityRole="link"
          onPress={() => openAccount(`${account.id}`)}
          style={({ pressed }) => [styles.link, pressed && styles.pressed]}
        >
          <Text style={styles.linkLabel}>Voir le compte ›</Text>
        </Pressable>
      </View>
    );
  };

  return (
    <SafeAreaView
      edges={TAB_SCREEN_EDGES}
      style={styles.safeArea}
      testID="vault-screen"
    >
      <ScrollView contentContainerStyle={[styles.content, fabSpace]}>
        <Pressable
          accessibilityRole="link"
          onPress={() => router.navigate("/(app)")}
          style={({ pressed }) => [styles.backLink, pressed && styles.pressed]}
        >
          <Ionicons
            color={colors.actionSecondaryText}
            name="chevron-back"
            size={20}
          />
          <Text style={styles.backLabel}>Retour à l’accueil</Text>
        </Pressable>
        <Text style={styles.eyebrow}>Mon épargne</Text>
        <Text accessibilityRole="header" style={styles.title}>
          Coffre
        </Text>
        <Text style={styles.lead}>
          Retrouvez l’argent mis de côté et les objectifs qui comptent pour
          vous.
        </Text>
        <Button
          icon="add"
          label="Nouveau compte"
          onPress={() => open({ mode: "create" })}
          variant="primary"
        />
        {notice ? (
          <FeedbackBanner kind="success">{notice}</FeedbackBanner>
        ) : null}

        {currencies.length > 1 ? (
          <RadioGroup
            choices={currencies.map((code) => ({ value: code, label: code }))}
            disabled={false}
            label="Devise du compte courant"
            onChange={setCurrency}
            value={currency}
          />
        ) : null}
        {current.status === "loading" ? (
          <FeedbackState
            description="Chargement du Coffre…"
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
        {current.value ? (
          <View style={[styles.card, styles.shellCard]}>
            <Text style={[styles.help, styles.onShellMuted]}>
              Compte courant
            </Text>
            <Text
              accessibilityRole="header"
              style={[styles.cardTitle, styles.onShell]}
            >
              Budget disponible · {monthLabel(current.value.month)}
            </Text>
            <Text style={[styles.bigAmount, styles.onShell]}>
              {formatVaultMoney(
                current.value.balanceMinorUnits,
                current.value.currency,
              )}
            </Text>
            <Text style={[styles.help, styles.onShellMuted]}>
              Calculé à partir du budget de l’application : base fixe, report et
              mouvements réels.
            </Text>
            <Button
              accessibilityLabel="Voir les mouvements du compte courant"
              label="Voir les mouvements"
              onPress={() => openAccount("current")}
            />
          </View>
        ) : null}

        <Text accessibilityRole="header" style={styles.sectionTitle}>
          Mes comptes d’épargne
        </Text>
        <RadioGroup<"active" | "archived">
          choices={[
            { value: "active", label: "Actifs" },
            { value: "archived", label: "Archivés" },
          ]}
          disabled={false}
          label="Afficher les comptes"
          onChange={setView}
          value={view}
        />
        {accounts.status === "loading" ? (
          <FeedbackState
            description="Chargement des comptes…"
            kind="loading"
            title="Chargement"
          />
        ) : null}
        {accounts.status === "error" ? (
          <FeedbackState
            actions={[
              {
                accessibilityLabel: "Réessayer les comptes",
                label: "Réessayer",
                onPress: accounts.retry,
              },
            ]}
            description="Vos données n’ont pas été modifiées. Vérifiez votre connexion puis réessayez."
            kind="error"
            title="Impossible de charger le Coffre"
          />
        ) : null}
        {accounts.status === "success" && visible.length === 0 ? (
          <FeedbackState
            actions={
              view === "active"
                ? [
                    {
                      label: "Créer un compte",
                      onPress: () => open({ mode: "create" }),
                    },
                  ]
                : []
            }
            description={
              accounts.hasNext
                ? "D’autres comptes peuvent être présents dans la suite de la liste."
                : view === "archived"
                  ? "Les comptes archivés resteront consultables ici."
                  : "Créez votre premier compte pour suivre votre épargne."
            }
            icon="wallet-outline"
            kind="empty"
            title={
              view === "archived"
                ? "Aucun compte archivé affiché"
                : "Votre Coffre est prêt"
            }
          />
        ) : null}
        {accounts.status === "success" && visible.length > 0 ? (
          <View style={styles.columns}>{visible.map(renderAccount)}</View>
        ) : null}
        {accounts.status === "success" && accounts.hasNext ? (
          <Button
            busy={accounts.paging}
            label="Afficher plus de comptes"
            onPress={accounts.loadMore}
          />
        ) : null}
        {accounts.pagingError ? (
          <Text accessibilityRole="alert" style={styles.error}>
            La suite des comptes n’a pas pu être chargée. Réessayez.
          </Text>
        ) : null}

        <View style={styles.notice}>
          <Text style={styles.noticeText}>
            Les dépôts et retraits ajustent votre budget disponible. Ils restent
            séparés des dépenses et revenus des Analyses.
          </Text>
        </View>
      </ScrollView>
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
    </SafeAreaView>
  );
};
