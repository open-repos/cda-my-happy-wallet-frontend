import React from 'react'
import "../../css/Home.css"
import imgCharges from "../../assets/icons/Charges.png";
import imgRevenus from "../../assets/icons/Revenus.png";
import { Link } from "react-router-dom";
import { faChevronCircleLeft } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import CardOperationFixe from './../components/CardOperationFixe';

const OperationsFixes = () => {
    console.log("INSIDE OPERATIONS FIXE")
  return (
    <div className='home-container'>
    <div className="goback">  <Link to="/home"><FontAwesomeIcon icon={faChevronCircleLeft} /> Annuler et revenir à la page d'accueil </Link></div>
    <h1>Home - Operations Fixes</h1>
    <div className="charge-revenu-container">
    <CardOperationFixe name={"Mes charges"} src={imgCharges}/>
    <CardOperationFixe name={"Mes revenus"} src={imgRevenus}/>
    </div>
    </div>
  )
}

export default OperationsFixes