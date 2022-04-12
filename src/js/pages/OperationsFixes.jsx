import React, { useState } from "react";
import "../../css/Home.css";
import imgCharges from "../../assets/icons/Charges.png";
import imgRevenus from "../../assets/icons/Revenus.png";
import { Link } from "react-router-dom";
import { faChevronCircleLeft } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import CardOperationFixe from "../components/OperationsFixes/CardOperationFixe";
import CalculRaV from "../components/CalculRaV";
import "../../css/Operations.css";

const OperationsFixes = () => {
  console.log("INSIDE OPERATIONS FIXE");
  const [RaVConfirmed, setRaVConfirmed] = useState(0);

  const calculRaV = (childdata) => {
    setRaVConfirmed(childdata);
  };

  const onSubmit = () => {
    console.log("rav", RaVConfirmed);
  };

  return (
    <div className="home-container">
      <div className="goback">
        {" "}
        <Link to="/home">
          <FontAwesomeIcon icon={faChevronCircleLeft} /> Revenir à la
          page d'accueil{" "}
        </Link>
      </div>
      <h1>Home - Operations Fixes</h1>
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
      {/* {calculRaV()} */}
      <CalculRaV calculRaV={calculRaV} period={"mois"} />
      <button type="button" className="btn-save" onClick={onSubmit}>
        Sauvegarder
      </button>
    </div>
  );
};

export default OperationsFixes;

