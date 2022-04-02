import React, { useState, useRef, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import "./../../css/Newpassword.css";
import Ok from "../../assets/icons/Ok.svg";
import newpassword from "../../assets/icons/Newpassword.svg";
// import { usenewpasswordMutation } from "../services/authService";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { Link } from "react-router-dom";
import { faChevronCircleLeft } from "@fortawesome/free-solid-svg-icons";
import { resetPsswdApi, newPsswdApi, reset } from "../slices/auth/authSlice";
import { useDispatch,useSelector } from "react-redux";
import { toast } from 'react-toastify'


const NewPassword = () => {
  let navigate = useNavigate();
  let location = useLocation();
  let dispatch = useDispatch();

  let from = location.state?.from?.pathname || "/";
  const [send, setSend] = useState(false);
  const [isconfirmPasswordPage, setIsconfirmPasswordPage] = useState(false);
  const toastId = React.useRef(null);
  const [searchParams, setSearchParams] = useSearchParams();
  // const resetToken = new URLSearchParams(search).get('resetToken');
  // console.log("search params",URLSearchParams(search))
  //body
  console.log(send)
  const { isError, message } = useSelector(
    (state) => state.auth
  )
  useEffect(() => {

    if (searchParams.has("resetToken")) {
      const resetToken = searchParams.get("resetToken");
      if (resetToken) {
        searchParams.delete("resetToken");
        console.log("setting params:", { searchParams: searchParams.toString() });
        console.dir(searchParams.toString());
        setSearchParams(searchParams);
        dispatch(resetPsswdApi(resetToken))
      }
    }

    console.log('toastId',toastId.current)
    if (isError) {
      toastId.current = message
      toast.error(message)
      toastId.current == null
      if (!isconfirmPasswordPage){
        navigate("/login")
      }
      setIsconfirmPasswordPage(false)
    }



  }, [isError, dispatch])

  //Api Logic
  // const [newpassword, { isLoading, isUpdating }] = usenewpasswordMutation();

  const Confirmationnewpassword =  () => {

    useEffect(() => {
        // You need to restrict it at some point
        // This is just dummy code and should be replaced by actual
        console.log(send)
        if(send){
          timeout(5000);
        }
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
    const [confirmPassword, setConfirmPassword] = useState("");
    const [password, setPassword] = useState("");
    // const toastId2 = React.useRef(null);
    const { isError,isSuccessConfirmNewPassword, message } = useSelector(
      (state) => state.auth
    )
    useEffect(()=>{

      console.log("isSuccessConfirmNewPassword",isSuccessConfirmNewPassword)
      if (isSuccessConfirmNewPassword==true) {
        setSend(true);
       }
   
      dispatch(reset())
    },[isSuccessConfirmNewPassword, dispatch])

    const handleSubmit = async (e) => {
      e.preventDefault();
      setIsconfirmPasswordPage(true)
      const body = { password, confirmPassword};
      dispatch(newPsswdApi(body))
    };
    return (
      <div className="newpassword">
        <form className="newpassword_form" onSubmit={handleSubmit}>
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
