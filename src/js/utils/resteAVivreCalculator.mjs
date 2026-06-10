export const getDaysInMonth = (month, year) => {
  return new Date(year, month, 0).getDate();
};

const sumAmounts = (items = []) => {
  return items.reduce(
    (accumulator, current) => accumulator + parseFloat(current.montant),
    0
  );
};

export const calculateResteAVivre = ({
  charges = [],
  revenus = [],
  period = "mois",
  date = new Date(),
}) => {
  const totalCharges = sumAmounts(charges);
  const totalRevenus = sumAmounts(revenus);
  const monthlyResteAVivre = totalRevenus - totalCharges;

  switch (period) {
    case "mois":
      return monthlyResteAVivre;
    case "jour": {
      const currentMonth = date.getMonth();
      const currentYear = date.getFullYear();
      const daysInCurrentMonth = getDaysInMonth(currentMonth, currentYear);
      return Math.round((monthlyResteAVivre / daysInCurrentMonth) * 100) / 100;
    }
    case "semaine":
      return Math.round((monthlyResteAVivre / 4) * 100) / 100;
    default:
      console.log(`Sorry, we are out of ${period}.`);
      return 0;
  }
};
