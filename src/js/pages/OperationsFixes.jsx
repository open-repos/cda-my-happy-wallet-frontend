import React, {useState} from 'react'
import "../../css/Home.css"
import imgCharges from "../../assets/icons/Charges.png";
import imgRevenus from "../../assets/icons/Revenus.png";
import { Link } from "react-router-dom";
import { faChevronCircleLeft } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import CardOperationFixe from './../components/CardOperationFixe';
import { useDispatch, useSelector } from "react-redux";

const OperationsFixes = () => {
    console.log("INSIDE OPERATIONS FIXE")
    const [RaVConfirmed, setRaVConfirmed] = useState(0);
    const { charges, revenus, isLoading } = useSelector(
      (state) => state.operationsFixes
    );
    const calculRaV = () => {
      console.log("INSIDE calculRav",)
      // console.log(
      //   charges.data.reduce((accumulator, current) => accumulator + parseFloat(current.montant), 0)
      // )
      let rav = 0
      if (charges.hasOwnProperty("data") && revenus.hasOwnProperty("data")){
        if(charges.data != null && revenus.data != null){
          const totalCharges =  charges.data.reduce((accumulator, current) => accumulator + parseFloat(current.montant), 0)
          const totalRevenus=  revenus.data.reduce((accumulator, current) => accumulator + parseFloat(current.montant), 0)
          rav = totalRevenus-totalCharges
        }
      } 
     
      
      // setRaV(totalRevenus-totalCharges)
      return(<h3>"Votre reste à vivre est de : "{rav} </h3>)
    }
  return (
    <div className='home-container'>
    <div className="goback">  <Link to="/home"><FontAwesomeIcon icon={faChevronCircleLeft} /> Annuler et revenir à la page d'accueil </Link></div>
    <h1>Home - Operations Fixes</h1>
    <div className="charge-revenu-container">
    <CardOperationFixe name={"Mes charges"} src={imgCharges} typeOpFixe={"charges"}/>
    <CardOperationFixe name={"Mes revenus"} src={imgRevenus} typeOpFixe={"revenus"}/>
    </div>
    {calculRaV()}
    </div>
  )
}

export default OperationsFixes