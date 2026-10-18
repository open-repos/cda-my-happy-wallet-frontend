const moneyFormatters = new Map();

const formatter = (currency, signed) => {
  const key = `${currency}:${signed}`;
  if (!moneyFormatters.has(key)) {
    moneyFormatters.set(
      key,
      new Intl.NumberFormat("fr-FR", {
        style: "currency",
        currency,
        signDisplay: signed ? "exceptZero" : "auto",
      })
    );
  }
  return moneyFormatters.get(key);
};

/** Montant API (`"-120.00"`) formaté en euros; `signed` affiche toujours le signe. */
export const formatMoney = (
  amount,
  currency = "EUR",
  { signed = false } = {}
) => formatter(currency, signed).format(Number(amount));

/** Valeur courte pour une case du calendrier, par exemple `−42` ou `1,2 k`. */
export const formatCompact = (amount) =>
  new Intl.NumberFormat("fr-FR", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(Number(amount));

export const monthName = (month) =>
  new Intl.DateTimeFormat("fr-FR", { month: "long", timeZone: "UTC" }).format(
    new Date(`${month}-01T00:00:00.000Z`)
  );

export const monthLabel = (month) =>
  new Intl.DateTimeFormat("fr-FR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${month}-01T00:00:00.000Z`));

export const longDate = (date) =>
  new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "long",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00.000Z`));

export const timestampDate = (timestamp) =>
  new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "long",
    timeZone: "Europe/Paris",
  }).format(new Date(timestamp));

/** « de septembre » ou « d’août » selon l'élision française. */
export const ofMonth = (month) => {
  const name = monthName(month);
  return /^[aeiouy]/i.test(name) ? `d’${name}` : `de ${name}`;
};
