import React ,{useState} from 'react'
import CalculRaV from './CalculRaV'
import "../../css/CaseRaV.css";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEdit } from '@fortawesome/free-solid-svg-icons';
import { Link } from 'react-router-dom';

const CaseShowRaV = () => {
    const [RaVConfirmed, setRaVConfirmed] = useState(0);

    const calculRaV = (childdata) => {
      setRaVConfirmed(childdata);
    };
  return (
      <>
     <div className="container-home-all">
          <div className="segmented-tabs">
            <p>Mois</p>
            <p>Semaine</p>
            <p>Jour</p>
          </div>
          <div className="rav-home">
          <CalculRaV calculRaV={calculRaV} period={"mois"} />
          <Link to="/home/operations-fixes">
          Modifier <FontAwesomeIcon icon={faEdit} />
          {/* <button className='btn-text'>Modifier <FontAwesomeIcon icon={faEdit} /></button> */}
          </Link>
          </div>
          <div className="cards-home-container">
            <p>Vous n'avez pas encore d'opérations financières</p>
            <p>Vous n'avez pas encore d'objectifs d'achats</p>
          </div>
        </div>
    </>
  )
}

export default CaseShowRaV