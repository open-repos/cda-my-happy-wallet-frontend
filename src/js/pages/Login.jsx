import React, { useState, useEffect } from "react";
import "./../../css/Login.css";
import logo from "./../../assets/Logo_Login.png"
import favIcon from "./../../assets/icons/logo.svg"
// import { useLoginMutation } from "../services/authService";
import { useLocation, useNavigate,useSearchParams } from "react-router-dom";
import { Link } from "react-router-dom";
import { useSelector, useDispatch } from 'react-redux'
import { toast } from 'react-toastify'
import { loginApi,reset } from "../slices/auth/authSlice";
// import { RequireAuth } from "../../features/auth/requireAuth";
import Spinner from '../components/Spinner'

const Login = () => {
  let navigate = useNavigate();
  let location = useLocation();

  let from = location.state?.from?.pathname || location.state?.pathname  || "/";
  const search = useLocation().search;
  const success = new URLSearchParams(search).get('success');
  const confirmationRegistration = new URLSearchParams(search).get('message');
  const toastId = React.useRef(null);
  //body
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  //Logic
  // const [formError, setFormError] = useState(null);

  const dispatch = useDispatch();
  // //Api Logic
  // const [login, { isLoading, isUpdating }] = useLoginMutation();

  const { user, isLoading, isError, isSuccess, isAuthenticated, message } = useSelector(
    (state) => state.auth
  )


  useEffect(() => {
    if (confirmationRegistration=="registrationok") {
      if(! toast.isActive(toastId.current)) {
        toastId.current = toast.success("Votre compte a bien été créée !")
      }
      
      navigate("/login")
    }
    if (isError) {
      if(! toast.isActive(toastId.current)) {
        toastId.current =  toast.error(message)
      }
     
    }
    // console.log("from",from)
    // console.log("isSuccess",isSuccess)
    // console.log("user",user)
    if (isSuccess || user) {
      navigate(from)
      // console.log("isSuccess",isSuccess)
      // console.log("user",user)
    }

    dispatch(reset())
  }, [user, isError, isSuccess, isAuthenticated,message, dispatch])

  const handleSubmit = async (e) => {
    e.preventDefault();
    const body = { email, password }
    dispatch(loginApi(body))
  };



  if (isLoading) {
    return <Spinner />
  }
  return (
    <div className="login">
      <img src={logo} width="300px" height="auto"/>
      <form className="login_form" onSubmit={(e) => handleSubmit(e)}>
        <h1>
          Bienvenue  <br /> sur MyHappyWallet <img src={favIcon} height='20rem' width="20rem"/>
        </h1>
        {/* <p style={{ color: "red" }}>{formError && formError}</p> */}
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
