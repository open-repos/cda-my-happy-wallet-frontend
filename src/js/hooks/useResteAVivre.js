import { useSelector } from "react-redux";
import {
  calculateResteAVivre,
  getDaysInMonth,
} from "../utils/resteAVivreCalculator.mjs";

export { getDaysInMonth };

export const useResteAVivre = (period) => {
  const { charges, revenus } = useSelector((state) => state.operationsFixes);

  if (charges.hasOwnProperty("data") && revenus.hasOwnProperty("data")) {
    if (charges.data != null && revenus.data != null) {
      return calculateResteAVivre({
        charges: charges.data,
        revenus: revenus.data,
        period,
      });
    }
  }

  return 0;
};
