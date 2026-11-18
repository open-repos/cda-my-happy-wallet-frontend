import { QuickAddProvider } from "./QuickAdd/QuickAddProvider";
import React from "react";
import { RequireAuth } from "./requireAuth";
import Sidebar from "./SideBar";
import { MutationRecovery } from "./Notifications/MutationFeedbackProvider";
import { SimulationProvider } from "./Simulation/SimulationContext";
import { MonthEndProvider } from "./MonthEnd/MonthEndContext";
import "../../css/MonthEnd.css";

export const ProtectedLayout = ({ children }) => {
  return (
    <RequireAuth>
      <SimulationProvider>
        <MonthEndProvider>
          <QuickAddProvider>
            <div className="protected-layout">
              <Sidebar />
              <div
                className="protected-layout__content"
                id="main-content"
                tabIndex={-1}
              >
                <MutationRecovery />
                {children}
              </div>
            </div>
          </QuickAddProvider>
        </MonthEndProvider>
      </SimulationProvider>
    </RequireAuth>
  );
};
