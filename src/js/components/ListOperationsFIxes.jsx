import React, { useEffect } from "react";
import { Table } from "semantic-ui-react";
import { useDispatch, useSelector } from "react-redux";
import {
  chargesApi,
  revenusApi,
} from "../slices/operationsFixes/operationsFixesSlice";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEuroSign,faEdit } from "@fortawesome/free-solid-svg-icons";
import "./../../css/FormControl.css";

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
        <div class="liste-opfixe">
          <Table className="table-opfixe" singleLine>
            <Table.Header className="header-table">
              <Table.Row>
                {/* <Table.HeaderCell>Id</Table.HeaderCell> */}
                <Table.HeaderCell>Titre</Table.HeaderCell>
                <Table.HeaderCell>Montant</Table.HeaderCell>
                <Table.HeaderCell>Devise</Table.HeaderCell>
                <Table.HeaderCell> </Table.HeaderCell>
              </Table.Row>
            </Table.Header>

            <Table.Body>
              {typeChosen.data.map((operationFixe) => (
                <Table.Row
                  id={operationFixe.idOperationFixe}
                  key={operationFixe.idOperationFixe}
                >
                  {/* <Table.Cell>{operationFixe.idOperationFixe}</Table.Cell> */}
                  <Table.Cell>{operationFixe.titre}</Table.Cell>
                  <Table.Cell>{operationFixe.montant}</Table.Cell>
                  <Table.Cell>{operationFixe.devise}<FontAwesomeIcon icon={faEuroSign} /></Table.Cell>
                  <Table.Cell><FontAwesomeIcon icon={faEdit} /></Table.Cell>
                </Table.Row>
              ))}
              {/* <Table.Row>
        <Table.Cell>John Lilki</Table.Cell>
        <Table.Cell>September 14, 2013</Table.Cell>
        <Table.Cell>jhlilk22@yahoo.com</Table.Cell>
        <Table.Cell>No</Table.Cell>
      </Table.Row>
      <Table.Row>
        <Table.Cell>Jamie Harington</Table.Cell>
        <Table.Cell>January 11, 2014</Table.Cell>
        <Table.Cell>jamieharingonton@yahoo.com</Table.Cell>
        <Table.Cell>Yes</Table.Cell>
      </Table.Row>
      <Table.Row>
        <Table.Cell>Jill Lewis</Table.Cell>
        <Table.Cell>May 11, 2014</Table.Cell>
        <Table.Cell>jilsewris22@yahoo.com</Table.Cell>
        <Table.Cell>Yes</Table.Cell>
      </Table.Row> */}
            </Table.Body>
          </Table>
          {/* <Table>
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
          </Table> */}
        </div>
      )}
    </>
  );
};

export default ListOperationsFIxes;
