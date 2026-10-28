import React, { useState } from "react";
import Wallet from "../../../assets/icons/Wallet-amico.svg";
import { HOME_CURRENCY, useHomeBudget } from "../../hooks/useHomeBudget";
import { PeriodToggle, RemainingToLive } from "../HomeBudget/RemainingToLive";
import { ExpensesByCategoryCard } from "../HomeBudget/ExpensesByCategoryCard";
import { GoalsCard } from "../HomeBudget/GoalsCard";
import "../../../css/BudgetCalendar.css";
import "../../../css/HomeBudget.css";

/** Accueil : reste à vivre du mois courant, dépenses et objectifs. */
const CaseShowRaV = ({ children }) => {
  const [period, setPeriod] = useState("mois");
  const { summary, expenses, goals } = useHomeBudget();

  return (
    <div className="home-budget">
      <PeriodToggle period={period} onChange={setPeriod} />
      <img className="home-budget__illustration" src={Wallet} alt="" />
      <RemainingToLive section={summary} period={period} />
      {children}
      <div className="home-budget__cards">
        <ExpensesByCategoryCard section={expenses} currency={HOME_CURRENCY} />
        <GoalsCard section={goals} currency={HOME_CURRENCY} />
      </div>
    </div>
  );
};

export default CaseShowRaV;
