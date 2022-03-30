import React from "react";
import { useEffect } from "react";
import { useDispatch,useSelector} from "react-redux";
import { useLocation, Navigate } from "react-router-dom";

//Services
import { login } from "./authSlice";
import { getLocalStorageItem } from "../../utils/localstorage";

export const RequireAuth = ({ children }) => {
  let location = useLocation();
  const dispatch = useDispatch()
  const user = getLocalStorageItem("user");

  useEffect(() => {
    const user = getLocalStorageItem("user");
    if (typeof(user) === "object") {
      // console.log("user", user);
      dispatch(login(user));
    } else {
        // console.log("user (Not String)", user);
    }
  }, []);

  const auth = useSelector((state) => state.auth);
  if (typeof(user) !== "object") {
    // Redirect them to the /login page, but save the current location they were
    // trying to go to when they were redirected. This allows us to send them
    // along to that page after they login, which is a nicer user experience
    // than dropping them off on the home page.
    console.log(auth,getLocalStorageItem("nickname"))
    return <Navigate to="/" state={{ from: location }} />;
  }

  return children;
};
