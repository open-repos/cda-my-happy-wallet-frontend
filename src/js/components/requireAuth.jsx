import React from "react";
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
  const authStorage = getLocalStorageItem("user");

  if (typeof(authStorage) === "object" && authStorage==null) {
    // Redirect them to the /login page, but save the current location they were
    // trying to go to when they were redirected. This allows us to send them
    // along to that page after they login, which is a nicer user experience
    // than dropping them off on the home page.
    return <Navigate to="/login" state={{ from: location }} />;
  }

  return <div style={sideBarChildren}> {children} </div>;
};
