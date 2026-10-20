import React from "react";
import { Link } from "react-router-dom";
import "../../css/Home.css";
import CaseOpFixeEmpty from "../components/HomeComponents/CaseOpFixeEmpty";
import CaseShowRaV from "../components/HomeComponents/CaseShowRaV";
import { useOperationsFixes } from "../hooks/useOperationsFixes";
import { SavingsCapacitySection } from "../components/FinancialGoals/SavingsCapacitySection";
import "../../css/BudgetForecast.css";
function Home() {
  // let navigate = useNavigate();
  // let location = useLocation();
  // let from = location.state?.from?.pathname || location.state?.pathname  || "/";
  // const search = useLocation().search;
  const { isEmptyOpFixe } = useOperationsFixes();

  return (
    <main>
      {isEmptyOpFixe ? <CaseOpFixeEmpty /> : <CaseShowRaV />}
      <SavingsCapacitySection />
      <Link className="home-forecast-link" to="/prochains-mois">
        Voir les prochains mois
      </Link>
    </main>
  );
}

export default Home;
