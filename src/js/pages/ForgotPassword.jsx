import React, { useState, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import "./../../css/Forgotpassword.css";
import "./../../css/Auth.css";
import mailSent from "../../assets/icons/Mail-sent.svg";
import forgotPassword from "./../../assets/icons/ForgotPassword.svg";
// import { useforgotpasswordMutation } from "../services/authService";
import { Link } from "react-router-dom";
import { faChevronCircleLeft } from "@fortawesome/free-solid-svg-icons";
import Spinner from '../components/Spinner'
import { forgotPsswdApi, reset } from './../slices/auth/authSlice'
import { toast } from 'react-toastify'
import { useDispatch,useSelector } from "react-redux";

const Forgotpassword = () => {
  let dispatch = useDispatch();
  const [send, setSend] = useState(false);
  const toastId = React.useRef(null);

  //Api Logic
  // const [forgotpassword, { isLoading, isUpdating }] = useforgotpasswordMutation();
  const { isLoading, isError, isEmailSent, message } = useSelector(
    (state) => state.auth
  )

  useEffect(() => {
    if (isError) {
      if(! toast.isActive(toastId.current)) {
        toastId.current =  toast.error(message)
      }
    }

    if(isEmailSent){
      setSend(true)
    }

    dispatch(reset())
  }, [message,isError,isEmailSent, dispatch])



  const Confirmationforgotpassword = () => {


    if (isLoading) {
      return <Spinner />
    }
    return (
      <div className="confirm-forgotpassword">
        <div className="goback">  <Link to="/login"><FontAwesomeIcon icon={faChevronCircleLeft} /> Retourner à la page de login</Link></div>
        <h1>
          <span style={{ color: "var(--orange-light)" }}>
            Votre demande a été prise en compte !{" "}
          </span>{" "}
        </h1>{" "}
        <h2>
          Vous allez recevoir un lien par email pour changer votre mot de passe
          </h2>
        <img src={mailSent} height="auto" width="40%" />
      </div>
    );
  };

  const FormForgotPassword = () => {
      //body
  const [email, setEmail] = useState("");


  const handleSubmit = async (e) => {
    e.preventDefault();
    const body = { email };

    dispatch(forgotPsswdApi(body))

  };

  if (isLoading) {
    return <Spinner />
  }
    return (
      <div className="forgotpassword">
        <form className="forgotpassword_form" onSubmit={(e) => handleSubmit(e)}>
          <div className="title">
          <h1>
          <span style={{ color: "var(--orange-light)" }}>Vous avez oublié votre mot de passe ? </span> </h1>  
          <h2>Renseignez votre email pour en définir un nouveau</h2>
          </div>
          <input
            type="email"
            name="email"
            placeholder="Entrez votre email"
            value={email}
            autoComplete="on"
            onChange={(e) => setEmail(e.target.value)}
          />
          <button type="submit" className="submit_btn">
          Changer de mot de passe
          </button>
          <div className="link-div">
            <Link to="/login">Je connais mon mot de passe ? Connectez vous ici</Link>
          </div>
        </form>
        <img src={forgotPassword} height="auto" width="20%" />
      </div>
    );
  };

  {
    if(send){
      return <Confirmationforgotpassword /> 
    } else{
      return <FormForgotPassword />
    }
  }

};

export default Forgotpassword;
