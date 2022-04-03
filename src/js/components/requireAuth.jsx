import React from "react";
import {useSelector} from "react-redux";
import { useLocation, Navigate } from "react-router-dom";

//Services
import { getLocalStorageItem } from "../../utils/localstorage";

const sideBarChildren={
  display: "flex",
  flexDirection:"row",
  alignItems:"space-around",
  // display: "inline-flex",
  // flexWrap: "wrap",
  // gap: "1px" 
  // justifyContent:"center"
}
export const RequireAuth = ({ children }) => {
  let location = useLocation();
  // const dispatch = useDispatch()
  const authStorage = getLocalStorageItem("user");
  const {isAuthenticated} = useSelector(
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

  return <div style={sideBarChildren}> {children} </div>;
};
