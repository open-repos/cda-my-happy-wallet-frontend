import React, { useState, useRef } from "react";
import CalculRaV from "../CalculRaV";
import "../../../css/CaseRaV.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEdit } from "@fortawesome/free-solid-svg-icons";
import { Link, Navigate, Outlet } from "react-router-dom";
import SegmentedControl from "../SegmentedControl";
import Wallet from "../../../assets/icons/Wallet-amico.svg"


const CaseShowRaV = () => {
  const [RaVConfirmed, setRaVConfirmed] = useState(0);
  const [selectedPeriod, setselectedPeriod] = useState("mois");
  
  
  const calculRaV = (childdata) => {
    setRaVConfirmed(childdata);
  };
  return (
    <>
      <div className="container-home-all">
          <div>
        <div className="segmented-tabs">
          <SegmentedControl
            name="group-2"
            callback={(val) =>  setselectedPeriod(val)
            }
            controlRef={useRef()}
            defaultIndex={0}
            segments={[
              {
                label: "Mois",
                value: "mois",
                ref: useRef(),
              },
              {
                label: "Semaine",
                value: "semaine",
                ref: useRef(),
              },
              {
                label: "Jour",
                value: "jour",
                ref: useRef(),
              },
            ]}
          />
          {/* <p className="selected-item">Selected: {selectedPeriod}</p> */}
        </div>
        <div className="rav-home">
          <img src={Wallet} height="5%" width="20%" />
          <CalculRaV calculRaV={calculRaV} period={selectedPeriod} />
          {/* <Outlet/> */}
          <Link to="/home/operations-fixes">
            Modifier vos charges/Revenus <FontAwesomeIcon icon={faEdit} />
          </Link>
        </div>
        </div>
        <div className="cards-home-container">
          <p>Vous n'avez pas encore d'opérations financières</p>
          <p>Vous n'avez pas encore d'objectifs d'achats</p>
        </div>
      </div>
    </>
  );
};

export default CaseShowRaV;
