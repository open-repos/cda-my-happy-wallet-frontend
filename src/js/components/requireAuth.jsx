import React from "react";
import { useEffect , useState} from "react";
import { useDispatch,useSelector} from "react-redux";
import { useLocation, Navigate,useNavigate } from "react-router-dom";

//Services
import { login, logout } from "../slices/auth/authSlice";
import { getLocalStorageItem } from "../../utils/localstorage";
import { removeLocalStorageItem } from "../../../../../Projet-08-Hackaton-13_17_Dec-Front/Hackathon-Quiz-App/src/js/utils/localstorage";

export const RequireAuth = ({ children }) => {
  let location = useLocation();
  const dispatch = useDispatch()
  const user = getLocalStorageItem("user");
  // const auth = useSelector((state) => state.auth);
  useEffect(() => {
    const user = getLocalStorageItem("user");
    // console.log(" auth.isAuthenticated", auth.isAuthenticated)
    console.log(typeof(user));
    if (typeof(user) === "object" && user!=null) {
      // setIsLoggedIn(true)
      console.log("user", user);
      dispatch(login(user));
    } else {
      // setIsLoggedIn(false)
      removeLocalStorageItem("user")
      dispatch(logout());
      console.log("user (Not String)", user);
    }
  }, []);


  if (typeof(user) === "object" && user==null) {
    // Redirect them to the /login page, but save the current location they were
    // trying to go to when they were redirected. This allows us to send them
    // along to that page after they login, which is a nicer user experience
    // than dropping them off on the home page.
    // console.log(auth,getLocalStorageItem("user"))
    // navigate("/login")
    return <Navigate to="/login" state={{ from: location }} />;
  }

  return children;
};
