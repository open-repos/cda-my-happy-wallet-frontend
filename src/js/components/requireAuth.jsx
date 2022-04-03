import React from "react";
import { useEffect , useState} from "react";
import { useDispatch,useSelector} from "react-redux";
import { useLocation, Navigate,useNavigate } from "react-router-dom";

//Services
import { logout,reset } from "../slices/auth/authSlice";
import { getLocalStorageItem,removeLocalStorageItem } from "../../utils/localstorage";

export const RequireAuth = ({ children }) => {
  let location = useLocation();
  // const dispatch = useDispatch()
  const authStorage = getLocalStorageItem("auth");
  const {auth, isAuthenticated} = useSelector(
    (state) => state.auth
  )
  console.log("INSIDE REQUIRE AUTH, auth STATE",isAuthenticated)
  console.log("INSIDE REQUIRE AUTH, auth STATE",authStorage)

  if (typeof(authStorage) === "object" && authStorage==null) {
    // Redirect them to the /login page, but save the current location they were
    // trying to go to when they were redirected. This allows us to send them
    // along to that page after they login, which is a nicer user experience
    // than dropping them off on the home page.
    // console.log(auth,getLocalStorageItem("user"))
    // navigate("/login")
    return <Navigate to="/login" state={{ from: location }} />;
  }



  // console.log("INSIDE REQUIRE AUTH useEffect, auth STATE",isAuthenticated)
  // if (!isAuthenticated) {
  //   // Redirect them to the /login page, but save the current location they were
  //   // trying to go to when they were redirected. This allows us to send them
  //   // along to that page after they login, which is a nicer user experience
  //   // than dropping them off on the home page.
  //   // console.log(auth,getLocalStorageItem("user"))
  //   // navigate("/login")
  //   return <Navigate to="/login" state={{ from: location }} />;
  // }

  return children;
};
