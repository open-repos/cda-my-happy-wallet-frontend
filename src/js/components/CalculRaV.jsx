import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEuroSign } from "@fortawesome/free-solid-svg-icons";
import { setLocalStorageItem } from "../../utils/localstorage";
export  const getDaysInMonth = (month,year)=> {
    return new Date(year, month, 0).getDate();
   };


const CalculRaV = (props) => {
    // const [rav , setRav] = useState(0)
    const [updateRav , setUpdateRav] = useState(false)
    const {calculRaV,period}=props
    console.log("INSIDE calculRav");
    const { charges, revenus, isLoading } = useSelector(
      (state) => state.operationsFixes
    );
  
    // useEffect(() => {
    //   if (updateRav) {
    //     calculRaV(rav);
    //   }
    // }, [])
    let rav = 0;
    if (charges.hasOwnProperty("data") && revenus.hasOwnProperty("data")) {
      if (charges.data != null && revenus.data != null) {
        const totalCharges = charges.data.reduce(
          (accumulator, current) => accumulator + parseFloat(current.montant),
          0
        );
        const totalRevenus = revenus.data.reduce(
          (accumulator, current) => accumulator + parseFloat(current.montant),
          0
        );

        let now = new Date()
        switch (period) {
            case 'mois':
                rav = totalRevenus - totalCharges;
                // setRav(totalRevenus - totalCharges)
                // setUpdateRav(true)
              break;
            case 'jour':
                const currentMonth = now.getMonth()
                const currentYear = now.getFullYear()
                const nbJourCurrentMont = getDaysInMonth(currentMonth,currentYear)
                rav =  Math.round(((totalRevenus - totalCharges)/nbJourCurrentMont)*100)/100;
                console.log("Case jour RaV:",rav)
                break
            case 'semaine':
                rav = Math.round(((totalRevenus - totalCharges)/4)*100)/100;
                console.log("Case jour semaine:",rav)
              break;
            default:
              console.log(`Sorry, we are out of ${period}.`);
          }
        
        calculRaV(rav);
      }
    }


  
    return (
      <h1 style={{ paddingTop: "20px" }}>
        Votre reste à vivre est de :{" "}
        <span style={{ color: "var(--orange-light)" }}>{rav} <FontAwesomeIcon icon={faEuroSign} /></span>{" "}
        par {period}
      </h1>
    );
  };

  export default CalculRaV
  