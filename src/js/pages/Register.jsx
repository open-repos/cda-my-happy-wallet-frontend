import React, { useCallback, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import "./../../css/Register.css";
import "./../../css/Auth.css";
import mailSent from "./../../assets/icons/Mail-sent.svg";
import favIcon from "./../../assets/icons/favicon.svg";
import { Link } from "react-router-dom";
import Spinner from "../components/Spinner";
import { register, reset } from "./../slices/auth/authSlice";
import { toast } from "react-toastify";

const ConfirmationRegister = () => {
  return (
    <main className="confirm-register" id="main-content" tabIndex={-1}>
      <section aria-labelledby="registration-feedback-title">
        <h1 id="registration-feedback-title">
          Demande d’inscription prise en compte
        </h1>
        <p>
          Si cette adresse peut être utilisée pour une inscription, vous
          recevrez un email de confirmation.
        </p>
        <p>
          Si vous avez déjà un compte, vous pouvez vous{" "}
          <Link to="/login">connecter</Link> ou{" "}
          <Link to="/forgot-password">réinitialiser votre mot de passe</Link>.
        </p>
      </section>
      <img src={mailSent} height="auto" width="40%" alt="" />
    </main>
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
    return (
      <main id="main-content" tabIndex={-1}>
        <Spinner />
      </main>
    );
  }

  return (
    <main className="register" id="main-content" tabIndex={-1}>
      <form className="register_form" onSubmit={handleSubmit}>
        <h1>
          Pas encore inscrit ? <br /> Créer un compte pour utiliser
          MyHappyWallet{" "}
          <img src={favIcon} height="20rem" width="20rem" alt="" />
        </h1>
        <label className="auth-field-label" htmlFor="register-firstname">
          Prénom
        </label>
        <input
          id="register-firstname"
          autoComplete="given-name"
          type="text"
          name="firstname"
          placeholder="Entrez prénom"
          value={firstname}
          onChange={onChange}
        />
        <label className="auth-field-label" htmlFor="register-lastname">
          Nom
        </label>
        <input
          id="register-lastname"
          autoComplete="family-name"
          type="text"
          name="lastname"
          placeholder="Entrez votre nom"
          value={lastname}
          onChange={onChange}
        />
        <label className="auth-field-label" htmlFor="register-email">
          Adresse email
        </label>
        <input
          id="register-email"
          autoComplete="email"
          type="email"
          name="email"
          placeholder="Entrez votre email"
          value={email}
          onChange={onChange}
        />
        <label className="auth-field-label" htmlFor="register-password">
          Mot de passe
        </label>
        <input
          id="register-password"
          autoComplete="new-password"
          type="password"
          name="password"
          placeholder="Entrez mot de passe"
          value={password}
          onChange={onChange}
        />
        <label className="auth-field-label" htmlFor="register-confirm-password">
          Confirmer le mot de passe
        </label>
        <input
          id="register-confirm-password"
          autoComplete="new-password"
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
    </main>
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
