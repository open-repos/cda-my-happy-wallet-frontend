import React, {useState} from "react";
import "./../../../css/FormControl.css";
import { FormCardOperationFixe } from "../FormOperationFixe/FormCardOperationFixe";
import ListOperationsFIxes from "./ListOperationsFIxes";

const CardOperationFixe = (props) => {
  const { name, src, typeOpFixe } = props;
  
  // const childToParent = (childdata) => {
  //   setsetRaVData(childdata);
  // }




  return (
    <div className="operation-container">
      <img src={src} />
      <h3 className="title-add-operationfixe">{name}</h3>
      <ListOperationsFIxes typeOpFixe={typeOpFixe}/>
      <FormCardOperationFixe   typeOpFixe={typeOpFixe} />
    </div>
  );
};

export default CardOperationFixe
