import React from 'react'
import { Formik, Form } from 'formik';
// import { TextField } from './TextField';
import * as Yup from 'yup';
import "../../../css/FormControl.css"
import FormikControl from "./FormikControl"


export const FormCardOperationFixe = () => {

  const array=[{value:'EUR',key:"EUR"},{value:'USD',key:"USD"}]
  const validate = Yup.object({
    titre: Yup.string()
      .min(2, 'Au moins 2 caractères requis')
      .max(50, 'Ne peux pas dépasser 50 caractères')
      .required('Requis'),
    montant: Yup.number()
      .min(1, 'Doit être > 0')
      .required('Requis'),
    devise: Yup.string()
    .min(3,"Devise")
    .max(3,"Devise max 3")
  })

  const onSubmit = values => {
    console.log('Form data', values)
  }
  return (
    <Formik
      initialValues={{
        titre: '',
        montant: '',
        devise: '',
      }}
      validationSchema={validate}
      onSubmit={onSubmit}
    >
      {formik => (
        <div className='operation-container'>
          {/* <h1 >Charges</h1> */}
          <Form>
            {/* <TextField label="Titre" name="titre" type="text" />
            <TextField label="Montant" name="montant" type="number" />
            <TextField label="Deivse" name="devise" type="text" />
            <button className="btn btn-dark mt-3" type="submit">Ok</button> */}
             {/* <div className='btn-input'> */}
             <div className='form-container'>
             <FormikControl
              control='input'
              type='text'
              label='Titre'
              name='titre'
            />
            <FormikControl
              control='input'
              type='number'
              label='Montant'
              name='montant'
            />
            <FormikControl
              control='select'
              label='Devise'
              name='devise'
              options={array}
            />
            <button className="bnt-cardOperationFixe" type='submit' disabled={!formik.isValid}>Ok</button>
            </div>
          </Form>
        </div>
      )}
    </Formik>
  )
}