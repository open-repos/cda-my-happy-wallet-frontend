import React, { useState, useEffect } from "react";
import { useSelector, useDispatch } from 'react-redux'
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import "./../../css/Register.css";
import mailSent from "./../../assets/icons/Mail-sent.svg";
import favIcon from "./../../assets/icons/favicon.svg"
// import { useRegisterMutation } from "../services/authService";
import { useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";
import { faChevronCircleLeft } from "@fortawesome/free-solid-svg-icons";
import Spinner from '../components/Spinner'
import { register, reset } from './../slices/auth/authSlice'
import { toast } from 'react-toastify'



const Register = () => {

  const [send, setSend] = useState(false);

  const toastId = React.useRef(null);



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

    const [formData, setFormData] = useState({
    firstname:"",
    lastname:"",
    email:'',
    password:'',
    confirmpassword:''
  })
  const {firstname,lastname,email,password,confirmpassword} = formData;

  const navigate = useNavigate()
  const dispatch = useDispatch()

  const { user, isLoading, isError, isSuccess, message } = useSelector(
    (state) => state.auth
  )

  useEffect(() => {
    console.log("isError",isError)
    console.log(message)
    if (isError) {
      "inside error block"
      if (message == undefined || message==""){
        toastId.current =  "User already exists"
        toast.error("User already exists")
      }else{
        toast.error(message)
      }

      toastId.current == null
    }

    if (isSuccess || user) {
      setSend(true)
      // navigate('/')
    }

    dispatch(reset())
  }, [user, isError, isSuccess, message, navigate, dispatch])

  const onChange = (e) => {
    setFormData((prevState)=>({
      ...prevState,
      [e.target.name]: e.target.value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    //input validation
    // let errorFlag = false;

    if (password !== confirmpassword) {
      toast.error('Passwords do not match', {
        position: "top-right",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        })
    } else {
      const userData = {
        firstname,
        lastname,
        email,
        password,
        confirmpassword
      }

    dispatch(register(userData))

  };}

  if (isLoading) {
    return <Spinner />
  }
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
