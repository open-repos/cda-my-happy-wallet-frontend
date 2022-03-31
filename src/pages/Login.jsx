import React, { useState } from "react";
import "./../css/Login.css";
import logo from "./../assets/Logo_Login.png"
import favIcon from "./../assets/icons/logo.svg"
// import { useLoginMutation } from "../services/authService";
import { useLocation, useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";
import { RequireAuth } from "../features/auth/requireAuth";


const Login = () => {
  let navigate = useNavigate();
  let location = useLocation();
  let from = location.state?.from?.pathname || "/";

  //body
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  //Logic
  const [formError, setFormError] = useState(null);

  // //Api Logic
  // const [login, { isLoading, isUpdating }] = useLoginMutation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const body = { email, password };
    // try {
    //   const result = await login(body);
    //   console.log("result", result);
    //   if (result.error) {
    //     return setFormError(result.error.data.message);
    //   }

    //   navigate("/home", { redirect: true });
    // } catch (err) {
    //   console.log("Something went wrong", err);
    // }
  };

  return (
    <div className="login">
      <img src={logo} width="300px" height="auto"/>
      <form className="login_form" onSubmit={(e) => handleSubmit(e)}>
        <h1>
          Bienvenue  <br /> sur MyHappyWallet <img src={favIcon} height='20rem' width="20rem"/>
        </h1>
        <p style={{ color: "red" }}>{formError && formError}</p>
        {/* {isLoading && <p>Loading...</p>} */}
        <input
          type="email"
          name="email"
          placeholder="Entrez votre email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          type="password"
          name="password"
          placeholder="Entrez mot de passe"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
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
