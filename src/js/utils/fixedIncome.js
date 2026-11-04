import { envelopeMonth, validEffectiveMonth } from "./envelopes";
import { parseHundredths } from "./decimalInput";
export const incomeInitialValues = (income) => ({
  titre: income?.titre ?? "",
  montant: String(income?.montant ?? ""),
  devise: income?.devise ?? "EUR",
  effectiveMonth: income ? envelopeMonth() : "",
});
export const validateIncome = (values) => {
  const errors = {};
  const amount = parseHundredths(values.montant);
  if (values.titre.trim().length < 2 || values.titre.trim().length > 50)
    errors.titre = "Saisissez un titre de 2 à 50 caractères.";
  if (amount === null || amount < 100 || amount > 9999999999)
    errors.montant =
      "Saisissez un montant reçu supérieur ou égal à 1, avec au plus deux décimales, par exemple 1 850,50.";
  if (!["EUR", "USD"].includes(values.devise))
    errors.devise = "Choisissez une devise.";
  if (!validEffectiveMonth(values.effectiveMonth))
    errors.effectiveMonth =
      "Choisissez le mois courant ou un mois futur (24 mois maximum).";
  return errors;
};
export const incomeBody = (values) => ({
  titre: values.titre.trim(),
  montant: parseHundredths(values.montant) / 100,
  devise: values.devise,
  ...(values.effectiveMonth ? { effectiveMonth: values.effectiveMonth } : {}),
});
