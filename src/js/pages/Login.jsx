import React, { useEffect, useRef, useState } from "react";
import {
  Link,
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import "./../../css/Login.css";
import "./../../css/Auth.css";
import logo from "./../../assets/Logo_Login.png";
import favIcon from "./../../assets/icons/logo.svg";
import { loginApi, reset } from "../slices/auth/authSlice";
import Spinner from "../components/Spinner";

const confirmationMessages = {
  "already-used":
    "Ce lien de confirmation a déjà été utilisé. Vous pouvez vous connecter.",
  "invalid-or-expired":
    "Ce lien de confirmation est invalide ou a expiré. Recommencez l’inscription pour recevoir un nouveau lien.",
};

const confirmationToastIds = {
  "already-used": "registration-confirmation-already-used",
  "invalid-or-expired": "registration-confirmation-invalid-or-expired",
};

const registrationSuccessToastId = "registration-confirmation-success";

export const getConfirmationMessage = (code) => {
  return confirmationMessages[code] ?? null;
};

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const dispatch = useDispatch();
  const toastId = useRef(null);
  const queryFeedbackHandled = useRef(false);
  const initialQuery = useRef({
    confirmation: searchParams.get("confirmation"),
    legacyMessage: searchParams.get("message"),
  }).current;
  const from =
    location.state?.from?.pathname || location.state?.pathname || "/";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { user, isLoading, isError, isSuccess, isAuthenticated, message } =
    useSelector((state) => state.auth);

  useEffect(() => {
    if (queryFeedbackHandled.current) {
      return;
    }
    queryFeedbackHandled.current = true;

    const cleanedSearchParams = new URLSearchParams(searchParams);
    let shouldCleanUrl = false;

    if (cleanedSearchParams.has("confirmation")) {
      const confirmationMessage = getConfirmationMessage(
        initialQuery.confirmation
      );

      if (confirmationMessage) {
        toast.error(confirmationMessage, {
          toastId: confirmationToastIds[initialQuery.confirmation],
        });
      }

      cleanedSearchParams.delete("confirmation");
      shouldCleanUrl = true;
    }

    if (initialQuery.legacyMessage === "registrationok") {
      toast.success("Votre compte a bien été créé !", {
        toastId: registrationSuccessToastId,
      });

      if (
        cleanedSearchParams.has("message") ||
        cleanedSearchParams.has("success")
      ) {
        cleanedSearchParams.delete("message");
        cleanedSearchParams.delete("success");
        shouldCleanUrl = true;
      }
    }

    if (shouldCleanUrl) {
      setSearchParams(cleanedSearchParams, { replace: true });
    }
  }, [initialQuery, searchParams, setSearchParams]);

  useEffect(() => {
    if (isError && !toast.isActive(toastId.current)) {
      toastId.current = toast.error(message);
    }

    if (isSuccess) {
      navigate(from);
    }

    dispatch(reset());
  }, [
    user,
    isError,
    isSuccess,
    isAuthenticated,
    message,
    dispatch,
    from,
    navigate,
  ]);

  const handleSubmit = (event) => {
    event.preventDefault();
    dispatch(loginApi({ email, password }));
  };

  if (isLoading) {
    return <Spinner />;
  }

  return (
    <div className="login">
      <img src={logo} width="300px" height="auto" alt="My Happy Wallet" />
      <form className="login_form" onSubmit={handleSubmit}>
        <h1>
          Bienvenue <br /> sur MyHappyWallet{" "}
          <img src={favIcon} height="20rem" width="20rem" alt="" />
        </h1>

        <input
          type="email"
          name="email"
          placeholder="Entrez votre email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <input
          type="password"
          name="password"
          placeholder="Entrez mot de passe"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        <div className="link-div">
          <Link className="link" to="/forgot-password">
            Mot de passe oublié ?
          </Link>
        </div>
        <button type="submit" className="submit_btn">
          Connexion
        </button>
        <div className="link-div">
          <Link to="/register" className="link">
            Pas encore inscrit ? Enregistrez vous ici
          </Link>
        </div>
      </form>
    </div>
  );
};

export default Login;
