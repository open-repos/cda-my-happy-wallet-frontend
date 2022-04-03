import React from 'react'
import imgCharges from "../../assets/icons/Charges.png";
import imgRevenus from "../../assets/icons/Revenus.png";
import {
    NavLink,
    useNavigate,
    Link,
    useLocation,
  } from "react-router-dom";
  import "../../css/Home.css"


const CaseOpFixeEmpty = () => {
    const navigate = useNavigate()
    const goToAddOperationsFixes = async (e) => {
        e.preventDefault();
        navigate("/home/operations-fixes")
      };
  return (
    <div className='home-container-start'>
    <h1>Commencez par calculer votre reste à vire</h1>
    <div className='img-txt-btn-ctn'>
    <div className='img-ctn'>
    <img src={imgCharges}/>
    <img src={imgRevenus}/>
    </div>
    <h3>Renseigner vos <span style={{color:"var(--orange-light)"}}>charges</span> et <span style={{color:"var(--orange-light)"}}>revenus</span> fixes</h3>
    <button onClick={goToAddOperationsFixes}>C'est parti</button>
    </div>
    </div>
  )
}

export default CaseOpFixeEmpty