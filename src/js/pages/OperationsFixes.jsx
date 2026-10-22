import React from "react";
import "../../css/Home.css";
import imgCharges from "../../assets/icons/Charges.png";
import imgRevenus from "../../assets/icons/Revenus.png";
import { Link } from "react-router-dom";
import { faChevronCircleLeft } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import CardOperationFixe from "../components/OperationsFixes/CardOperationFixe";
import { FixedBudgetSummary } from "../components/OperationsFixes/FixedBudgetSummary";
import "../../css/Operations.css";

const OperationsFixes = () => {
  return (
    <main className="home-container">
      <div className="goback">
        {" "}
        <Link to="/home">
          <FontAwesomeIcon icon={faChevronCircleLeft} /> Revenir à la page
          d'accueil{" "}
        </Link>
      </div>
      <h1>Mes charges et revenus fixes</h1>
      <div className="charge-revenu-container">
        <CardOperationFixe
          name={"Mes charges"}
          src={imgCharges}
          typeOpFixe={"charges"}
        />
        <CardOperationFixe
          name={"Mes revenus"}
          src={imgRevenus}
          typeOpFixe={"revenus"}
        />
      </div>
      <FixedBudgetSummary />
    </main>
  );
};

export default OperationsFixes;
