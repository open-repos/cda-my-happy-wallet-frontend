import Ionicons from "@expo/vector-icons/Ionicons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ReactNode, useState } from "react";
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
import {
  DecisionPlan,
  MonthEndDecision,
  addMonths,
  canKeepDecision,
  capitalize,
  carryBeforeCorrection,
  decisionAccounts,
  isDecidableMonth,
  monthLabel,
  monthName,
  ofMonth,
  ofMonthLabel,
  planOf,
  previewCarry,
} from "@/src/features/month-end/domain/monthEnd";
import { DecisionForm } from "@/src/features/month-end/presentation/DecisionForm";
import {
  DecisionCalculation,
  ReviewNotice,
  accountLabel,
} from "@/src/features/month-end/presentation/MonthEndParts";
import { monthEndStyles as styles } from "@/src/features/month-end/presentation/monthEndStyles";
import {
  usePostponed,
  useMonthEndDecision,
} from "@/src/features/month-end/presentation/useMonthEnd";
import {
  SavingsAccount,
  formatVaultMoney,
} from "@/src/features/vault/domain/vault";
import {
  VAULT_TWO_COLUMNS,
  vaultColors as colors,
  vaultStyles as shared,
} from "@/src/features/vault/presentation/vaultStyles";

const BackLink = () => {
  const router = useRouter();
  return (
    <Pressable
      accessibilityRole="link"
      onPress={() => router.navigate("/(app)")}
      style={({ pressed }) => [shared.backLink, pressed && shared.pressed]}
    >
      <Ionicons
        color={colors.actionSecondaryText}
        name="chevron-back"
        size={20}
      />
      <Text style={shared.backLabel}>Retour à l’accueil</Text>
    </Pressable>
  );
};

const Frame = ({ children }: { children: ReactNode }) => (
  <SafeAreaView
    edges={TAB_SCREEN_EDGES}
    style={shared.safeArea}
    testID="month-end-screen"
  >
    {children}
  </SafeAreaView>
);

const Scroll = ({ children }: { children: ReactNode }) => (
  <ScrollView contentContainerStyle={shared.content}>{children}</ScrollView>
);

/** Écran « Décider » (#420) : route cachée `/month-end?mois=AAAA-MM`. */
export const MonthEndScreen = () => {
  const { mois } = useLocalSearchParams<{ mois?: string }>();
  const month = typeof mois === "string" ? mois : undefined;
  if (!isDecidableMonth(month)) {
    return (
      <Frame>
        <Scroll>
          <BackLink />
          <Text style={shared.eyebrow}>Fin de mois</Text>
          <Text accessibilityRole="header" style={shared.title}>
            Décision de fin de mois
          </Text>
          <FeedbackState
            description={
              month !== undefined && /^\d{4}-(0[1-9]|1[0-2])$/.test(month)
                ? `${capitalize(monthLabel(month))} n’est pas encore terminé. La décision sur son solde sera proposée le premier jour du mois suivant.`
                : "Ce mois n’existe pas."
            }
            kind="empty"
            title="Pas encore disponible"
          />
        </Scroll>
      </Frame>
    );
  }
  return <DecisionView key={month} month={month} />;
};

const Lines = ({
  decision,
  accounts,
}: {
  decision: MonthEndDecision;
  accounts: readonly SavingsAccount[];
}) => {
  const money = (value: number) =>
    formatVaultMoney(value, decision.currency, true);
  const rows: [string, string, number][] =
    decision.resultBeforeDecisionMinorUnits < 0
      ? [
          ...decision.coverage.map((row): [string, string, number] => [
            `Prélèvement sur ${accountLabel(accounts, row.accountId)}`,
            "Retrait vers le compte courant",
            row.amountMinorUnits,
          ]),
          ...(decision.exceptionalIncomeMinorUnits > 0
            ? [
                [
                  "Entrée exceptionnelle",
                  "Catégorie « Entrée exceptionnelle » des Analyses",
                  decision.exceptionalIncomeMinorUnits,
                ] as [string, string, number],
              ]
            : []),
        ]
      : decision.savings.map((row) => [
          `Épargne sur ${accountLabel(accounts, row.accountId)}`,
          "Virement depuis le compte courant",
          -row.amountMinorUnits,
        ]);
  if (rows.length === 0) {
    return (
      <Text style={shared.text}>
        Aucun virement : tout le solde est reporté.
      </Text>
    );
  }
  return (
    <>
      {rows.map(([title, detail, amount], index) => (
        <View
          key={title}
          accessible
          accessibilityLabel={`${title}, ${detail} : ${money(amount)}`}
          style={[shared.movement, index === 0 && shared.firstMovement]}
        >
          <View style={shared.movementCopy}>
            <Text style={shared.amount}>{title}</Text>
            <Text style={shared.help}>{detail}</Text>
          </View>
          <Text style={shared.amount}>{money(amount)}</Text>
        </View>
      ))}
    </>
  );
};

const DecisionView = ({ month }: { month: string }) => {
  const router = useRouter();
  const twoColumns = useWindowDimensions().width >= VAULT_TWO_COLUMNS;
  const { decision, accounts, mutation, save } = useMonthEndDecision(month);
  const { postpone } = usePostponed(month);
  const [editing, setEditing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const data = decision.value;
  const ready =
    decision.status === "success" && accounts.status === "success" && data;
  const next = monthName(addMonths(month, 1));

  if (decision.status === "error" || accounts.status === "error") {
    return (
      <Frame>
        <Scroll>
          <BackLink />
          <Text style={shared.eyebrow}>Fin de mois</Text>
          <Text accessibilityRole="header" style={shared.title}>
            {`Décision ${ofMonthLabel(month)}`}
          </Text>
          <FeedbackState
            actions={[
              {
                label: "Réessayer",
                onPress: () => {
                  if (decision.status === "error") decision.retry();
                  if (accounts.status === "error") accounts.retry();
                },
              },
            ]}
            description="La décision de fin de mois n’a pas pu être chargée. Vos données n’ont pas été modifiées. Vérifiez votre connexion puis réessayez."
            kind="error"
            title="Décision indisponible"
          />
        </Scroll>
      </Frame>
    );
  }
  if (!ready) {
    return (
      <Frame>
        <Scroll>
          <BackLink />
          <Text style={shared.eyebrow}>Fin de mois</Text>
          <FeedbackState
            description="Chargement de la décision…"
            kind="loading"
            title="Chargement"
          />
        </Scroll>
      </Frame>
    );
  }

  const decided = data.status === "DECIDED";
  const showForm = !decided || editing;
  const usable = decisionAccounts(accounts.value ?? [], data);
  const header = (
    <>
      <BackLink />
      <Text style={shared.eyebrow}>Fin de mois</Text>
      <Text accessibilityRole="header" style={shared.title}>
        {showForm && decided
          ? `Modifier la décision ${ofMonthLabel(month)}`
          : decided
            ? `Décision ${ofMonthLabel(month)}`
            : `Décider du solde ${ofMonthLabel(month)}`}
      </Text>
      <Text style={shared.lead}>
        {decided
          ? `Révision ${data.revision}. La décision reste modifiable ; ${next} et les mois suivants sont recalculés.`
          : "Tant que vous ne décidez pas, tout le solde reste reporté sur le mois suivant."}
      </Text>
      <Text
        style={[
          styles.tag,
          decided && !data.requiresReview ? styles.tagOk : styles.tagPending,
        ]}
      >
        {data.requiresReview
          ? "! À revoir"
          : decided
            ? "✓ Décidée"
            : "En attente de décision"}
      </Text>
    </>
  );

  const submit = async (plan: DecisionPlan) => {
    setNotice(null);
    const outcome = await save(
      plan,
      data.revision,
      `Décision ${ofMonthLabel(month)} enregistrée.`,
    );
    if (outcome?.status === "saved") {
      setEditing(false);
      setNotice(outcome.message);
    }
  };

  if (!decided && data.resultBeforeDecisionMinorUnits === 0) {
    return (
      <Frame>
        <Scroll>
          {header}
          <FeedbackState
            description={`${capitalize(monthLabel(month))} se termine à l’équilibre : il n’y a rien à reporter ni à épargner.`}
            kind="empty"
            title="Rien à décider"
          />
        </Scroll>
      </Frame>
    );
  }

  if (showForm) {
    return (
      <Frame>
        <DecisionForm
          key={`${data.revision}:${editing}`}
          accounts={usable}
          busy={mutation.busy}
          decision={data}
          editing={decided}
          header={
            <>
              {header}
              {data.requiresReview ? <ReviewNotice decision={data} /> : null}
            </>
          }
          onCancel={() => {
            mutation.clear();
            if (decided) setEditing(false);
            else {
              postpone();
              router.navigate("/(app)");
            }
          }}
          onSubmit={(plan) => void submit(plan)}
          notice={notice}
          serverMessage={mutation.failure}
          twoColumns={twoColumns}
        />
      </Frame>
    );
  }

  const carry = previewCarry(data.resultBeforeDecisionMinorUnits, planOf(data));
  const keep = canKeepDecision(data);
  const edit = () => {
    mutation.clear();
    setNotice(null);
    setEditing(true);
  };
  const split = (
    <View style={[shared.card, twoColumns ? shared.column : null]}>
      <Text accessibilityRole="header" style={shared.cardTitle}>
        {data.resultBeforeDecisionMinorUnits < 0
          ? "Couverture du déficit"
          : "Répartition du solde"}
      </Text>
      <Lines accounts={accounts.value ?? []} decision={data} />
    </View>
  );
  const calculation = (
    <View style={[shared.card, twoColumns ? shared.column : null]}>
      <Text accessibilityRole="header" style={shared.cardTitle}>
        Calcul du report
      </Text>
      <DecisionCalculation
        accounts={accounts.value ?? []}
        decision={data}
        plan={planOf(data)}
        previousCarry={data.requiresReview ? carryBeforeCorrection(data) : null}
      />
      <Text style={shared.help}>
        {carry < 0
          ? `Le déficit restant (${formatVaultMoney(carry, data.currency)}) réduit le reste à vivre de ${next}.`
          : `Les ${formatVaultMoney(carry, data.currency)} reportés s’ajoutent au reste à vivre de ${next}.`}
      </Text>
    </View>
  );
  return (
    <Frame>
      <Scroll>
        {header}
        {notice ? (
          <FeedbackBanner kind="success">{notice}</FeedbackBanner>
        ) : null}
        {mutation.failure ? (
          <FeedbackBanner kind="error">{mutation.failure}</FeedbackBanner>
        ) : null}
        {data.requiresReview ? (
          <ReviewNotice decision={data}>
            {keep ? null : (
              <Text style={shared.text}>
                Cette répartition ne correspond plus au nouveau solde : modifiez
                la décision pour l’ajuster.
              </Text>
            )}
            <View style={shared.actions}>
              {keep ? (
                <Button
                  busy={mutation.busy}
                  label="Garder ma décision"
                  onPress={() => void submit(planOf(data))}
                  style={shared.grow}
                  variant="primary"
                />
              ) : null}
              <Button
                disabled={mutation.busy}
                label="Modifier la décision"
                onPress={edit}
                style={shared.grow}
              />
            </View>
          </ReviewNotice>
        ) : null}
        {twoColumns ? (
          <View style={shared.columns}>
            {split}
            {calculation}
          </View>
        ) : (
          <>
            {split}
            {calculation}
          </>
        )}
        <View style={shared.actions}>
          {data.requiresReview ? null : (
            <Button
              disabled={mutation.busy}
              label="Modifier la décision"
              onPress={edit}
              style={shared.grow}
              variant="primary"
            />
          )}
          <Button
            label={`Voir le résumé ${ofMonth(month)}`}
            onPress={() =>
              router.push({
                pathname: "/(app)/calendar",
                params: { mois: month },
              })
            }
            style={shared.grow}
          />
          <Button
            label="Voir le Coffre"
            onPress={() => router.push("/(app)/vault")}
            style={shared.grow}
          />
        </View>
      </Scroll>
    </Frame>
  );
};
