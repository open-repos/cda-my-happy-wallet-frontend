import React from "react";
import { PageHeader } from "../components/PageHeader";
import { Link } from "react-router-dom";
import "../../css/Home.css";
import CaseOpFixeEmpty from "../components/HomeComponents/CaseOpFixeEmpty";
import CaseShowRaV from "../components/HomeComponents/CaseShowRaV";
import { useOperationsFixes } from "../hooks/useOperationsFixes";
import { SavingsCapacitySection } from "../components/FinancialGoals/SavingsCapacitySection";
import { SimulationControls } from "../components/Simulation/SimulationControls";
import { EnvelopeSection } from "../components/Envelopes/EnvelopeSection";
import "../../css/BudgetForecast.css";
function Home() {
  const { isEmptyOpFixe } = useOperationsFixes();

  return (
    <main className="atelier-home">
      <PageHeader eyebrow="Mon budget" title="Accueil">
        Votre budget, vos enveloppes et votre épargne au même endroit.
      </PageHeader>
      <SimulationControls />
      {isEmptyOpFixe ? (
        <>
          <CaseOpFixeEmpty />
          <EnvelopeSection />
        </>
      ) : (
        <CaseShowRaV>
          <EnvelopeSection />
        </CaseShowRaV>
      )}
      <SavingsCapacitySection />
      <Link className="home-forecast-link" to="/prochains-mois">
        Voir les prochains mois
      </Link>
    </main>
  );
}

export default Home;
