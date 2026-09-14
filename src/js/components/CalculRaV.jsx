import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEuroSign } from "@fortawesome/free-solid-svg-icons";
import { useResteAVivre } from "../hooks/useResteAVivre";

export { getDaysInMonth } from "../hooks/useResteAVivre";


const CalculRaV = (props) => {
    // const [rav , setRav] = useState(0)
    const {calculRaV,period}=props
    const rav = useResteAVivre(period);
  
    // useEffect(() => {
    //   if (updateRav) {
    //     calculRaV(rav);
    //   }
    // }, [])
    if (calculRaV) {
        calculRaV(rav);
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
  
