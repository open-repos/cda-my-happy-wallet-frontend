import React from "react";
import { RequireAuth } from "./requireAuth";
import Sidebar from "./SideBar";

export const ProtectedLayout = ({ children }) => {
  return (
    <RequireAuth>
      <div className="protected-layout">
        <Sidebar />
        <div className="protected-layout__content">{children}</div>
      </div>
    </RequireAuth>
  );
};
