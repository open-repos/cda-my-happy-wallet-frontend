import React, { useState, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import "./../../css/Newpassword.css";
import Ok from "../../assets/icons/Ok.svg";
import newpassword from "../../assets/icons/Newpassword.svg";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { Link } from "react-router-dom";
import { faChevronCircleLeft } from "@fortawesome/free-solid-svg-icons";
import { resetPsswdApi, newPsswdApi, reset } from "../slices/auth/authSlice";
import { useDispatch,useSelector } from "react-redux";
import { toast } from 'react-toastify'


const NewPassword = () => {
  let navigate = useNavigate();
  let dispatch = useDispatch();

  const [send, setSend] = useState(false);
  const [isconfirmPasswordPage, setIsconfirmPasswordPage] = useState(false);
  const toastId = React.useRef(null);
  const [searchParams, setSearchParams] = useSearchParams();

  const { isError, message } = useSelector(
    (state) => state.auth
  )
  useEffect(() => {

    if (searchParams.has("resetToken")) {
      const resetToken = searchParams.get("resetToken");
      if (resetToken) {
        searchParams.delete("resetToken");
        setSearchParams(searchParams);
        dispatch(resetPsswdApi(resetToken))
      }
    }

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


  const Confirmationnewpassword =  () => {

    useEffect(() => {
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
    const {isSuccessConfirmNewPassword } = useSelector(
      (state) => state.auth
    )
    useEffect(()=>{

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
         <div className="goback">  <Link to="/login"><FontAwesomeIcon icon={faChevronCircleLeft} /> Annuler et revenir à la page de login</Link></div>
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
        <img src={newpassword}/>
      </div>
    );
  };

  return <>{send ? <Confirmationnewpassword /> : <FormNewpassword />}</>;
};

export default NewPassword;
