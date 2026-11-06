import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  chargesApi,
  revenusApi,
} from "../../slices/operationsFixes/operationsFixesSlice";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEuroSign,faEdit } from "@fortawesome/free-solid-svg-icons";
import "./../../../css/FormControl.css";

const ListOperationsFIxes = (props) => {
  const dispatch = useDispatch();
  const { typeOpFixe } = props;
  const { charges, revenus, isLoading } = useSelector(
    (state) => state.operationsFixes
  );
  let typeChosen = null;
  if (typeOpFixe == "charges") {
    typeChosen = charges;
  } else if (typeOpFixe == "revenus") {
    typeChosen = revenus;
  } else {
    return <>"Error chargement operations fixes"</>;
  }

  useEffect(() => {
   if (charges.data == null ) {
    //   if (charges.data.length == 0) {
        dispatch(chargesApi());
    //   }
   }else if(charges.data.length == 0){
    dispatch(chargesApi())
   }

    if (revenus.data == null) {
    //   if (revenus.data.length == 0) {
        dispatch(revenusApi());
    //   }
    }else if(revenus.data.length == 0){
        dispatch(revenusApi());
    }
    // dispatch(chargesApi());
    // dispatch(revenusApi());
  }, [charges.isError, charges.isSuccess]);

  return (
    <>
      {isLoading ? (
        <p style={{ color: "orange" }}>
          {" "}
          {typeOpFixe} en cours de chargement ...{" "}
        </p>
      ) : null}
      {typeChosen.data != null && (
        <div className="liste-opfixe">
          {/* Tableau HTML : semantic-ui-react, non maintenu, n'apportait aucun
              style et émettait des avertissements React (#211). */}
          <table className="table-opfixe">
            <thead className="header-table">
              <tr>
                <th>Titre</th>
                <th>Montant</th>
                <th>Devise</th>
                <th> </th>
              </tr>
            </thead>
            <tbody>
              {typeChosen.data.map((operationFixe) => (
                <tr
                  id={operationFixe.idOperationFixe}
                  key={operationFixe.idOperationFixe}
                >
                  <td>{operationFixe.titre}</td>
                  <td>{operationFixe.montant}</td>
                  <td>
                    {operationFixe.devise}
                    <FontAwesomeIcon icon={faEuroSign} />
                  </td>
                  <td>
                    <FontAwesomeIcon icon={faEdit} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
};

export default ListOperationsFIxes;
