import React from "react";
import "./../../css/FormControl.css";
import { FormCardOperationFixe } from "./FormOperationFixe/FormCardOperationFixe";


const CardOperationFixe = (props) => {
  const { name, src } = props;
  return (
    <div className="operation-container">
      <img src={src} />
      <h3 className="title-add-operationfixe">{name}</h3>
      <FormCardOperationFixe />
    </div>
  );
};

export default CardOperationFixe
