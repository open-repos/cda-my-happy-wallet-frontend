import React from "react";
import { Formik, Form, Field } from "formik";
// import { TextField } from './TextField';
import * as Yup from "yup";
import "../../../css/FormControl.css";
import FormikControl from "./FormikControl";
import { addChargesApi, addRevenusApi } from "../../slices/operationsFixes/operationsFixesSlice";
import { useDispatch } from "react-redux";
export const FormCardOperationFixe = (props) => {
 const {typeOpFixe} = props
  const dispatch = useDispatch();
  const array = [
    { value: "EUR", key: "EUR" },
    { value: "USD", key: "USD" },
  ];
  const validate = Yup.object({
    titre: Yup.string()
      .min(2, "Au moins 2 caractères requis")
      .max(50, "Ne peux pas dépasser 50 caractères")
      .required("Requis"),
    montant: Yup.number().min(1, "Doit être > 0").required("Requis"),
    devise: Yup.string().min(3, "Devise").max(3, "Devise max 3"),
  });

  const onSubmit = (values) => {
    console.log("Form data", values);
    if (typeOpFixe=="charges"){
      dispatch(addChargesApi(values));
    } else{
      dispatch(addRevenusApi(values));
    }

  };
  return (
    <Formik
      initialValues={{
        titre: "",
        montant: "",
        devise: "EUR",
      }}
      validationSchema={validate}
      onSubmit={onSubmit}
    >
      {(formik) => (
        <div className="operation-container">
          {/* <h1 >Charges</h1> */}
          <Form>
            {/* <TextField label="Titre" name="titre" type="text" />
            <TextField label="Montant" name="montant" type="number" />
            <TextField label="Deivse" name="devise" type="text" />
            <button className="btn btn-dark mt-3" type="submit">Ok</button> */}
            {/* <div className='btn-input'> */}
            <div className="form-container">
              <FormikControl
                control="input"
                type="text"
                label="Titre"
                name="titre"
              />
              <FormikControl
                control="input"
                type="number"
                label="Montant"
                name="montant"
              />
              {/* <FormikControl
                control="select"
                label="Devise"
                name="devise"
                options={array}
              /> */}
              <Field
                as="select"
                name="devise"
              >
                <option>Devise</option>
                <option value="EUR" selected="selected">EUR</option>
                <option value="USD">USD</option>
              </Field>
              <button
                className="bnt-cardOperationFixe"
                type="submit"
                disabled={!formik.isValid}
              >
                Ok
              </button>
            </div>
          </Form>
        </div>
      )}
    </Formik>
  );
};
