import { QuickAddProvider } from "./QuickAdd/QuickAddProvider";
import React from "react";
import { RequireAuth } from "./requireAuth";
import Sidebar from "./SideBar";
import { SimulationProvider } from "./Simulation/SimulationContext";

export const ProtectedLayout = ({ children }) => {
  return (
    <RequireAuth>
      <SimulationProvider>
        <QuickAddProvider>
          <div className="protected-layout">
            <Sidebar />
            <div
              className="protected-layout__content"
              id="main-content"
              tabIndex={-1}
            >
              {children}
            </div>
          </div>
        </QuickAddProvider>
      </SimulationProvider>
    </RequireAuth>
  );
};
