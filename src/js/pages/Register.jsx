import React, { useState, useRef, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import "./../../css/Register.css";
import mailSent from "./../../assets/icons/Mail-sent.svg";
import favIcon from "./../../assets/icons/favIcon.svg"
// import { useRegisterMutation } from "../services/authService";
import { useLocation, useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";
import { faChevronCircleLeft } from "@fortawesome/free-solid-svg-icons";

const Register = () => {
  let navigate = useNavigate();
  let location = useLocation();
  let from = location.state?.from?.pathname || "/";

  const [send, setSend] = useState(false);
  //Logic
  const [formError, setFormError] = useState(null);

  //Api Logic
  // const [register, { isLoading, isUpdating }] = useRegisterMutation();


  const ConfirmationRegister = () => {
    return (
      <div className="confirm-register">
        <div className="goback">  <Link to="/login"><FontAwesomeIcon icon={faChevronCircleLeft} /> Retourner à la page de login</Link></div>
        <h1>
          <span style={{ color: "var(--orange-light)" }}>
            Merci pour votre incription !{" "}
          </span>{" "}
          Vous allez recevoir un mail de confirmation
        </h1>{" "}
        <img src={mailSent} height="auto" width="40%" />
      </div>
    );
  };

  const FormRegister = () => {
     //body
  // const [firstname, setFirstname] = useState("");
  // const [lastname, setLastname] = useState("");
  // const [confirmPassword, setConfirmPassword] = useState("");
  // const [email, setEmail] = useState("");
  // const [password, setPassword] = useState("");

    const [formData, setFormData] = useState({
    firstname:"",
    lastname:"",
    email:'',
    password:'',
    confirmpassword:''
  })
  const {firstname,lastname,email,password,confirmpassword} = formData;


  const onChange = (e) => {
    setFormData((prevState)=>({
      ...prevState,
      [e.target.name]: e.target.value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    const body = { firstname, lastname, password, confirmpassword, email };

    //input validation
    let errorFlag = false;
    setSend(true);
    //   if (password.length < 6 || password.length > 15) {
    //     errorFlag = true;

    //     setFormError(
    //       "Password doit être d'une longueur minimale de 6 char et maximale de 15 char"
    //     );
    //   }

    //   try {
    //     const result = await register(body);
    //     console.log("result", result);
    //     if (result.error) {
    //       return setFormError(result.error.data.message);
    //     }

    //     navigate("/register", { redirect: true });
    //   } catch (err) {
    //     console.log("Something went wrong", err);
    //   }
  };

    return (
      <div className="register">
        <form className="register_form" onSubmit={(e) => handleSubmit(e)}>
          <h1>
            Pas encore inscrit ? <br /> Créer un compte pour utiliser
            MyHappyWallet <img src={favIcon} height='20rem' width="20rem"/>
          </h1>
          {/* <p style={{ color: "red" }}>{formError && formError}</p> */}
          {/* {isLoading && <p>Loading...</p>} */}
          <input
            type="text"
            name="firstname"
            placeholder="Entrez prénom"
            value={firstname}
            onChange={onChange}
          />
          <input
            type="text"
            name="lastname"
            placeholder="Entrez votre nom"
            value={lastname}
            autoComplete="on"
            onChange={onChange}
          />
          <input
            type="email"
            name="email"
            placeholder="Entrez votre email"
            value={email}
            autoComplete="on"
            onChange={onChange}
          />
          <input
            type="password"
            name="password"
            placeholder="Entrez mot de passe"
            value={password}
            onChange={onChange}
          />
          <input
            type="password"
            name="confirmpassword"
            placeholder="Confirmez votre mot de passe"
            value={confirmpassword}
            onChange={onChange}
          />
          <button type="submit" className="submit_btn">
            S'enregistrer
          </button>
          <div className="link-div">
            <Link to="/login">Déjà inscrit ? Connectez vous ici</Link>
          </div>
        </form>
      </div>
    );
  };
  {
    if(send){
      return <ConfirmationRegister />
    } else{
      return <FormRegister />
    }
  }
  // return <>{send ? <ConfirmationRegister /> : <FormRegister />}</>;
};

export default Register;
