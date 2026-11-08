import React, { useRef, useState } from "react";
import { FormDialog } from "../Forms/FormDialog";
import { Button } from "../Actions/Button";
import { LiveMessage } from "../LiveMessage";
import { savingsService, isSavingsDate } from "../../services/savingsService";
import { parseHundredths } from "../../utils/decimalInput";
import { savingsToday } from "./savingsFormat";
import { SavingsMovements } from "./SavingsMovements";

const titles = {
  create: "Créer un compte d’épargne",
  rename: "Renommer le compte",
  deposit: "Déposer sur le compte",
  withdraw: "Retirer du compte",
  link: "Rattacher un objectif",
};
const labels = {
  create: "Créer le compte",
  rename: "Renommer",
  deposit: "Déposer",
  withdraw: "Retirer",
  link: "Rattacher",
};
const validName = (name) =>
  name.trim().length >= 2 && [...name.trim()].length <= 50;

/** Each uncertain transfer retains its immutable payload and idempotency key. */
export const SavingsForm = ({ mode, account, goals, mutation, onClose }) => {
  const [name, setName] = useState(mode === "rename" ? account.name : "");
  const [currency, setCurrency] = useState("EUR");
  const [amount, setAmount] = useState(mode === "create" ? "0" : "");
  const [date, setDate] = useState(savingsToday);
  const [goalId, setGoalId] = useState("");
  const [error, setError] = useState("");
  const [uncertain, setUncertain] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const attempt = useRef(null),
    submitting = useRef(false),
    form = useRef(null);
  const transfer = mode === "deposit" || mode === "withdraw";
  const locked = mutation.busy || uncertain;
  const eligible = goals.filter(
    (goal) => !goal.savingsAccountId && goal.currency === account?.currency
  );
  const submit = async (event) => {
    event.preventDefault();
    if (submitting.current || mutation.busy) return;
    setError("");
    const cents = parseHundredths(amount);
    if (!uncertain) {
      let failure = "";
      if (["create", "rename"].includes(mode) && !validName(name))
        failure = "Le nom doit contenir entre 2 et 50 caractères.";
      else if (
        (transfer || mode === "create") &&
        (cents === null || cents > 9999999999 || (transfer && cents <= 0))
      )
        failure = transfer
          ? "Saisissez un montant strictement positif avec au plus deux décimales."
          : "Saisissez un solde positif ou nul avec au plus deux décimales.";
      else if (
        mode === "create" &&
        !/^[A-Z]{3}$/.test(currency.trim().toUpperCase())
      )
        failure = "Indiquez une devise sur trois lettres, par exemple EUR.";
      else if (transfer && (!isSavingsDate(date) || date > savingsToday()))
        failure = "Choisissez une date valide, au plus tard aujourd’hui.";
      else if (
        mode === "link" &&
        !eligible.some((goal) => goal.id === Number(goalId))
      )
        failure = "Choisissez un objectif disponible dans la même devise.";
      if (failure) {
        setError(failure);
        form.current?.querySelector("input, select")?.focus();
        return;
      }
      attempt.current = transfer
        ? {
            direction: mode === "deposit" ? "TO_SAVINGS" : "FROM_SAVINGS",
            amountMinorUnits: cents,
            operationDate: date,
            reason: "MANUAL",
            idempotencyKey: `manual:${crypto.randomUUID()}`,
          }
        : null;
    }
    const actions = {
      create: () =>
        savingsService.create({
          name: name.trim(),
          currency: currency.trim().toUpperCase(),
          initialBalanceMinorUnits: cents,
        }),
      rename: () => savingsService.rename(account.id, name.trim()),
      link: () => savingsService.linkGoal(account.id, Number(goalId)),
      deposit: () => savingsService.transfer(account.id, attempt.current),
      withdraw: () => savingsService.transfer(account.id, attempt.current),
    };
    submitting.current = true;
    try {
      const result = await mutation.run(
        actions[mode],
        transfer
          ? "Virement enregistré."
          : mode === "link"
          ? "Objectif rattaché."
          : mode === "rename"
          ? "Compte renommé."
          : "Compte créé."
      );
      if (result.ok) onClose();
      else if (transfer)
        setUncertain((previous) => previous || Boolean(result.uncertain));
    } finally {
      submitting.current = false;
    }
  };
  return (
    <FormDialog
      labelledBy="savings-form-title"
      busy={locked}
      onClose={onClose}
      restoreFocus
      surfaceClassName="savings-dialog"
      closeLabel="Fermer le formulaire du Coffre"
    >
      <h2 id="savings-form-title">{titles[mode]}</h2>
      {account && (
        <p>
          {account.name} · {account.currency}
        </p>
      )}
      <form ref={form} className="savings-form" onSubmit={submit} noValidate>
        {["create", "rename"].includes(mode) && (
          <label>
            Nom du compte
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              disabled={locked}
              maxLength={100}
              required
            />
          </label>
        )}
        {mode === "create" && (
          <label>
            Devise
            <input
              value={currency}
              onChange={(event) => setCurrency(event.target.value)}
              disabled={locked}
              maxLength={3}
              autoCapitalize="characters"
              required
            />
          </label>
        )}
        {(mode === "create" || transfer) && (
          <label>
            {mode === "create"
              ? "Solde initial"
              : mode === "deposit"
              ? "Montant à déposer"
              : "Montant à retirer"}
            <input
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              inputMode="decimal"
              disabled={locked}
              required
              aria-describedby="savings-impact"
            />
          </label>
        )}
        {transfer && (
          <label>
            Date du virement
            <input
              type="date"
              value={date}
              max={savingsToday()}
              min="1000-01-01"
              onChange={(event) => setDate(event.target.value)}
              disabled={locked}
              required
            />
          </label>
        )}
        {mode === "link" && (
          <>
            <label>
              Objectif
              <select
                value={goalId}
                onChange={(event) => setGoalId(event.target.value)}
                disabled={locked}
                required
              >
                <option value="">Choisir un objectif</option>
                {eligible.map((goal) => (
                  <option key={goal.id} value={goal.id}>
                    {goal.title} · {goal.savedAmount} {goal.currency} déjà
                    épargnés
                  </option>
                ))}
              </select>
            </label>
            {!eligible.length && (
              <p>
                Aucun objectif disponible dans cette devise. Créez un objectif
                dans « Objectifs et événements ».
              </p>
            )}
            <p id="savings-impact">
              Un objectif déjà alimenté nécessite un compte vierge : son épargne
              sera reprise comme solde initial. Le serveur vérifie ce
              rattachement ; deux épargnes existantes ne seront pas
              additionnées.
            </p>
          </>
        )}
        {mode === "create" && (
          <p id="savings-impact">
            Le solde initial représente une épargne déjà constituée. Il ne
            débite pas votre budget disponible.
          </p>
        )}
        {transfer && (
          <p id="savings-impact" className="savings-notice">
            {mode === "deposit"
              ? "Compte courant → épargne : ce dépôt réduit le budget disponible du mois du virement."
              : "Épargne → compte courant : ce retrait augmente le budget disponible du mois du virement."}{" "}
            Les virements restent exclus des dépenses et revenus des Analyses.
            Les soldes sont recalculés par le serveur après validation.
          </p>
        )}
        <LiveMessage
          message={error || (mutation.error ? mutation.message : "")}
          isError
        />
        {uncertain && (
          <div className="savings-notice">
            <p>
              Les champs sont conservés pour reprendre exactement ce virement.
              Vérifiez les mouvements, puis utilisez « Reprendre ce virement » :
              cette reprise ne créera pas de doublon.
            </p>
            <Button
              onClick={() => setVerifying((value) => !value)}
              busy={mutation.busy}
            >
              {verifying ? "Masquer les mouvements" : "Vérifier les mouvements"}
            </Button>
            {verifying && <SavingsMovements accountId={account.id} />}
          </div>
        )}
        <div className="savings-form__actions">
          <Button onClick={onClose} disabled={locked}>
            Annuler
          </Button>
          <Button variant="primary" type="submit" busy={mutation.busy}>
            {uncertain ? "Reprendre ce virement" : labels[mode]}
          </Button>
        </div>
      </form>
    </FormDialog>
  );
};
