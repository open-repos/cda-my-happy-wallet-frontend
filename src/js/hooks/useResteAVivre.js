import { useSelector } from "react-redux";

export const getDaysInMonth = (month, year) => {
  return new Date(year, month, 0).getDate();
};

export const useResteAVivre = (period) => {
  const { charges, revenus } = useSelector((state) => state.operationsFixes);

  let rav = 0;
  if (charges.hasOwnProperty("data") && revenus.hasOwnProperty("data")) {
    if (charges.data != null && revenus.data != null) {
      const totalCharges = charges.data.reduce(
        (accumulator, current) => accumulator + parseFloat(current.montant),
        0
      );
      const totalRevenus = revenus.data.reduce(
        (accumulator, current) => accumulator + parseFloat(current.montant),
        0
      );

      let now = new Date();
      switch (period) {
        case "mois":
          rav = totalRevenus - totalCharges;
          break;
        case "jour": {
          const currentMonth = now.getMonth();
          const currentYear = now.getFullYear();
          const nbJourCurrentMont = getDaysInMonth(currentMonth, currentYear);
          rav =
            Math.round(((totalRevenus - totalCharges) / nbJourCurrentMont) * 100) /
            100;
          console.log("Case jour RaV:", rav);
          break;
        }
        case "semaine":
          rav = Math.round(((totalRevenus - totalCharges) / 4) * 100) / 100;
          console.log("Case jour semaine:", rav);
          break;
        default:
          console.log(`Sorry, we are out of ${period}.`);
      }
    }
  }

  return rav;
};
