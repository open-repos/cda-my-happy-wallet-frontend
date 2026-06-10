import React from "react";
import { RequireAuth } from "./requireAuth";
import Sidebar from "./SideBar";

export const ProtectedLayout = ({ children }) => {
  return (
    <RequireAuth>
      <Sidebar />
      {children}
    </RequireAuth>
  );
};
