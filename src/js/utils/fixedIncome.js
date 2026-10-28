import { envelopeMonth, validEffectiveMonth } from "./envelopes";
export const incomeInitialValues = (income) => ({
  titre: income?.titre ?? "",
  montant: String(income?.montant ?? ""),
  devise: income?.devise ?? "EUR",
  effectiveMonth: income ? envelopeMonth() : "",
});
export const validateIncome = (values) => {
  const errors = {};
  const amount = Number(values.montant.trim().replace(",", "."));
  if (values.titre.trim().length < 2 || values.titre.trim().length > 50)
    errors.titre = "Saisissez un titre de 2 à 50 caractères.";
  if (
    !/^\d+(?:[.,]\d+)?$/.test(values.montant.trim()) ||
    !Number.isFinite(amount) ||
    amount < 1
  )
    errors.montant = "Saisissez un montant reçu supérieur ou égal à 1.";
  if (!["EUR", "USD"].includes(values.devise))
    errors.devise = "Choisissez une devise.";
  if (!validEffectiveMonth(values.effectiveMonth))
    errors.effectiveMonth =
      "Choisissez le mois courant ou un mois futur (24 mois maximum).";
  return errors;
};
export const incomeBody = (values) => ({
  titre: values.titre.trim(),
  montant: Number(values.montant.trim().replace(",", ".")),
  devise: values.devise,
  ...(values.effectiveMonth ? { effectiveMonth: values.effectiveMonth } : {}),
});
