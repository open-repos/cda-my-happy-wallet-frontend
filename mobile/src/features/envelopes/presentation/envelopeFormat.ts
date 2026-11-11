export const monthLabel = (month: string) =>
  new Intl.DateTimeFormat("fr-FR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${month}-01T00:00:00.000Z`));

export const longDate = (date: string) =>
  new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "long",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00.000Z`));

export const operationCountLabel = (count: number) =>
  `${count} opération${count > 1 ? "s" : ""} rattachée${count > 1 ? "s" : ""}`;
