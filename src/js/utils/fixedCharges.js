export const CHARGE_PERIODS = [
  { value: "MENSUELLE", label: "Mensuelle — tous les mois", months: 1 },
  {
    value: "BIMESTRIELLE",
    label: "Bimestrielle — tous les deux mois",
    months: 2,
  },
  {
    value: "TRIMESTRIELLE",
    label: "Trimestrielle — tous les trois mois",
    months: 3,
  },
  {
    value: "SEMESTRIELLE",
    label: "Semestrielle — tous les six mois",
    months: 6,
  },
  { value: "ANNUELLE", label: "Annuelle — tous les ans", months: 12 },
];

// Centimes / centièmes de pourcentage : aucun arrondi intermédiaire.
const hundredths = (value) => {
  const text = String(value).trim().replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(text)) return null;
  const [whole, fraction = ""] = text.split(".");
  const result = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  return Number.isSafeInteger(result) ? result : null;
};
export const validateCharge = (values) => {
  const errors = {};
  const title = values.titre.trim();
  if (title.length < 2 || title.length > 50)
    errors.titre = "Saisissez un titre de 2 à 50 caractères.";
  const amount = hundredths(values.montant);
  if (amount === null || amount < 1 || amount > 9999999999)
    errors.montant =
      "Saisissez un montant de 0,01 à 99 999 999,99, avec au plus deux décimales.";
  const share = hundredths(values.pourcentagePersonnel);
  if (share === null || share > 10000)
    errors.pourcentagePersonnel =
      "Saisissez un pourcentage de 0 à 100, avec au plus deux décimales.";
  if (!CHARGE_PERIODS.some(({ value }) => value === values.periodicite))
    errors.periodicite = "Choisissez une périodicité.";
  if (!["EUR", "USD"].includes(values.devise))
    errors.devise = "Choisissez une devise.";
  return errors;
};
const decimal = (cents) =>
  `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, "0")}`;
export const chargePreview = (values) => {
  const amount = hundredths(values.montant);
  const share = hundredths(values.pourcentagePersonnel);
  const period = CHARGE_PERIODS.find(
    ({ value }) => value === values.periodicite
  );
  if (
    amount === null ||
    amount < 1 ||
    amount > 9999999999 ||
    share === null ||
    share > 10000 ||
    !period
  )
    return null;
  const round = (divisor) =>
    Math.floor((amount * share + divisor / 2) / divisor);
  return {
    montantPersonnel: decimal(round(10000)),
    montantMensuelPersonnel: decimal(round(10000 * period.months)),
  };
};
export const chargeInitialValues = (charge) => ({
  titre: charge?.titre ?? "",
  montant: String(charge?.montant ?? ""),
  devise: charge?.devise ?? "EUR",
  periodicite: charge?.periodicite ?? "MENSUELLE",
  pourcentagePersonnel: String(charge?.pourcentagePersonnel ?? 100),
});
export const chargeBody = (values) => ({
  titre: values.titre.trim(),
  montant: hundredths(values.montant) / 100,
  devise: values.devise,
  periodicite: values.periodicite,
  pourcentagePersonnel: hundredths(values.pourcentagePersonnel) / 100,
});
// Les montants reçus restent autoritaires ; calcul de secours seulement pour
// les anciennes lignes sans les nouveaux champs (mensuelles à 100 %).
export const chargeDisplay = (charge) => {
  const legacy =
    charge.periodicite == null && charge.pourcentagePersonnel == null;
  return {
    ...charge,
    periodicite: charge.periodicite ?? "MENSUELLE",
    pourcentagePersonnel: charge.pourcentagePersonnel ?? 100,
    montantPersonnel:
      charge.montantPersonnel ?? (legacy ? charge.montant : null),
    montantMensuelPersonnel:
      charge.montantMensuelPersonnel ?? (legacy ? charge.montant : null),
  };
};
