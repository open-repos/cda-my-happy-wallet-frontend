import React from "react";
import "../../css/Home.css";
import { Link } from "react-router-dom";
import { faChevronCircleLeft } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
// Cette feuille historique fournit encore des styles globaux aux autres pages.
// Conserver son import pendant le remplacement des anciens composants fixes.
import "../../css/FormControl.css";
import { FixedOperations } from "../components/OperationsFixes/FixedOperations";
import "../../css/Operations.css";

const OperationsFixes = () => (
  <main className="home-container fixed-operations-page">
    <div className="goback">
      <Link to="/home">
        <FontAwesomeIcon icon={faChevronCircleLeft} /> Revenir à la page
        d'accueil
      </Link>
    </div>
    <FixedOperations />
  </main>
);
export default OperationsFixes;
