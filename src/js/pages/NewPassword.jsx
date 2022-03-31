import React, { useState, useRef, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import "./../../css/Newpassword.css";
import Ok from "../../assets/icons/Ok.svg";
import newpassword from "../../assets/icons/Newpassword.svg";
// import { usenewpasswordMutation } from "../services/authService";
import { useLocation, useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";
import { faChevronCircleLeft } from "@fortawesome/free-solid-svg-icons";
const NewPassword = () => {
  let navigate = useNavigate();
  let location = useLocation();
  let from = location.state?.from?.pathname || "/";

  //body
  const [confirmPassword, setConfirmPassword] = useState("");
  const [password, setPassword] = useState("");
  const [send, setSend] = useState(false);
  //Logic
  const [formError, setFormError] = useState(null);

  //Api Logic
  // const [newpassword, { isLoading, isUpdating }] = usenewpasswordMutation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const body = { password, confirmPassword};

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
    //     const result = await newpassword(body);
    //     console.log("result", result);
    //     if (result.error) {
    //       return setFormError(result.error.data.message);
    //     }

    //     navigate("/newpassword", { redirect: true });
    //   } catch (err) {
    //     console.log("Something went wrong", err);
    //   }
  };

  const Confirmationnewpassword =  () => {
    // useEffect(() => {
    //     if (!token) {
    //         getToken();
    //     }
    //   }, []);
    
    //   const getToken = async () => {
    //     const headers = {
    //       Authorization: authProps.idToken // using Cognito authorizer
    //     };
    //     const response = await axios.post(
    //       "https://MY_ENDPOINT.execute-api.us-east-1.amazonaws.com/v1/",
    //       API_GATEWAY_POST_PAYLOAD_TEMPLATE,
    //       { headers }
    //     );
    //     const data = await response.json();
    //     setToken(data.access_token);
    //   };
    useEffect(() => {
        // You need to restrict it at some point
        // This is just dummy code and should be replaced by actual
            timeout(3000);
      }, []);
    
      const timeout = async (delay) => {
        await new Promise( res => setTimeout(res, delay) );
        navigate("/login", { redirect: true });
    };
    

    return (
      <div className="confirm-newpassword">
        <div className="goback">  <Link to="/login"><FontAwesomeIcon icon={faChevronCircleLeft} /> Retourner à la page de login</Link></div>
        <h1>
          <span style={{ color: "var(--orange-light)" }}>
            Votre demande a été prise en compte !{" "}
          </span>{" "}
        </h1>{" "}
        <h2>
          Votre mot de passe a été modifié avec succès
          </h2>
          <img src={Ok} height="auto" width="30%" />
          {/* {timeout()} */}
      </div>
    );
  };

  const FormNewpassword = () => {
    return (
      <div className="newpassword">
        <form className="newpassword_form" onSubmit={(e) => handleSubmit(e)}>
          <div className="title">
          <h1>
          <span style={{ color: "var(--orange-light)" }}>Choisissez votre nouveau mot de passe </span> </h1>  
          </div>
          <input
            type="password"
            name="password"
            placeholder="Entrez mot de passe"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <input
            type="password"
            name="confirmpassword"
            placeholder="Confirmez votre mot de passe"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
          <button type="submit" className="submit_btn">
            Confirmation du nouveau mot de passe
          </button>
        </form>
        <img src={newpassword} height="auto" width="20%" />
      </div>
    );
  };

  return <>{send ? <Confirmationnewpassword /> : <FormNewpassword />}</>;
};

export default NewPassword;
