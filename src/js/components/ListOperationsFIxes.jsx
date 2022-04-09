import React, { useEffect } from "react";
import { Header, Message, Table } from "semantic-ui-react";
import { useDispatch, useSelector } from "react-redux";
import {
  chargesApi,
  revenusApi,
} from "../slices/operationsFixes/operationsFixesSlice";


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
    console.log(charges);
    dispatch(chargesApi());
    dispatch(revenusApi());
  }, []);

  return (
    <>
      {isLoading ? <p style={{color:"orange"}}> {typeOpFixe} en cours de chargement ... </p> : null}
      {typeChosen.data.length != 0 && (
        <div>
          <Table>
            <thead>
              <tr>
                <th>Id</th>
                <th>Titre</th>
                <th>Montant</th>
                <th>Devise</th>
                <th>Modifier</th>
              </tr>
            </thead>
            <tbody>
              {typeChosen.data.map((operationFixe) => (
                <tr
                  id={operationFixe.idOperationFixe}
                  key={operationFixe.idOperationFixe}
                >
                  <td>{operationFixe.idOperationFixe}</td>
                  <td>{operationFixe.titre}</td>
                  <td>{operationFixe.montant}</td>
                  <td>{operationFixe.devise}</td>
                  <td>Modifier</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      )}
    </>
  );
};

export default ListOperationsFIxes;
