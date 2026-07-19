import React, { useCallback, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import "./../../css/Register.css";
import "./../../css/Auth.css";
import mailSent from "./../../assets/icons/Mail-sent.svg";
import favIcon from "./../../assets/icons/favicon.svg";
import { Link } from "react-router-dom";
import { faChevronCircleLeft } from "@fortawesome/free-solid-svg-icons";
import Spinner from "../components/Spinner";
import { register, reset } from "./../slices/auth/authSlice";
import { toast } from "react-toastify";

const ConfirmationRegister = () => {
  return (
    <div className="confirm-register">
      <div className="goback">
        <Link to="/login">
          <FontAwesomeIcon icon={faChevronCircleLeft} /> Retourner à la page de
          login
        </Link>
      </div>
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

const FormRegister = ({ onRegistered }) => {
  const [formData, setFormData] = useState({
    firstname: "",
    lastname: "",
    email: "",
    password: "",
    confirmpassword: "",
  });
  const { firstname, lastname, email, password, confirmpassword } = formData;
  const toastId = React.useRef(null);
  const dispatch = useDispatch();
  const { user, isLoading, isError, isSuccess, message } = useSelector(
    (state) => state.auth
  );

  useEffect(() => {
    if (isError) {
      if (message == undefined || message == "") {
        toastId.current = "Registration failed";
        toast.error("Registration failed");
      } else {
        toast.error(message);
      }

      toastId.current == null;
    }

    if (isSuccess || user) {
      onRegistered();
    }

    dispatch(reset());
  }, [user, isError, isSuccess, message, dispatch, onRegistered]);

  const onChange = (event) => {
    const { name, value } = event.target;

    setFormData((previousFormData) => ({
      ...previousFormData,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (password !== confirmpassword) {
      toast.error("Passwords do not match", {
        position: "top-right",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
      });
    } else {
      dispatch(
        register({
          firstname,
          lastname,
          email,
          password,
          confirmpassword,
        })
      );
    }
  };

  if (isLoading) {
    return <Spinner />;
  }

  return (
    <div className="register">
      <form className="register_form" onSubmit={handleSubmit}>
        <h1>
          Pas encore inscrit ? <br /> Créer un compte pour utiliser
          MyHappyWallet <img src={favIcon} height="20rem" width="20rem" />
        </h1>
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

const Register = () => {
  const [send, setSend] = useState(false);
  const handleRegistered = useCallback(() => setSend(true), []);

  return send ? (
    <ConfirmationRegister />
  ) : (
    <FormRegister onRegistered={handleRegistered} />
  );
};

export default Register;
