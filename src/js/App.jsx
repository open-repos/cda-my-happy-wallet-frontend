import React from "react";
import "./../css/App.css";
import { ToastContainer } from "react-toastify";
//Components
import { ProtectedLayout } from "./components/ProtectedLayout";
//Pages
import Calendrier from "./pages/Calendrier";
import ListeOperations from "./pages/ListeOperations";
import Objectifs from "./pages/Objectifs";
import Profil from "./pages/Profil";
import Home from "./pages/Home";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import { Routes, Route, Navigate } from "react-router-dom";
import NewPassword from "./pages/NewPassword";
import 'react-toastify/dist/ReactToastify.css';
import OperationsFixes from "./pages/OperationsFixes";
import CalculRaV from "./components/CalculRaV";

function App() {
  return (
    <>
      <div className="App">
        <header></header>
        <main>
        <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/new-password" element={<NewPassword />} />
            
            {/* <Route path="/home" element={<RequireAuth><Sidebar /><Home /> </RequireAuth>}>
              <Route path="rav-mois" element={<CalculRaV period={"mois"} />}/>
              <Route path="rav-semaine" element={<CalculRaV period={"semaine"} />}/>
              <Route path="rav-jour" element={<CalculRaV period={"jour"} />}/>
              </Route> */}
                        
              <Route path="home" element={<ProtectedLayout><Home /> </ProtectedLayout>}/>
              <Route path="home/operations-fixes" element={<ProtectedLayout><OperationsFixes/> </ProtectedLayout>}/>
            <Route path="/" element={ <Navigate replace to="/home" />} />

            <Route path="/calendrier" element={<ProtectedLayout><Calendrier /></ProtectedLayout>}></Route>
            <Route
              path="/objectifs-evenements"
              element={
                <ProtectedLayout>
                  <Objectifs />
                </ProtectedLayout>
              }
            ></Route>
            <Route
              path="/operations"
              element={
                <ProtectedLayout>
                  <ListeOperations />
                </ProtectedLayout>
              }
            ></Route>
            <Route
              path="/profil"
              element={
                <ProtectedLayout>
                  <Profil />
                </ProtectedLayout>
              }
            ></Route>
            {/* </Route> */}
            <Route path="*" element={<NotFound />}></Route>
          </Routes>
        </main>
      </div>
    </>
  );
}

export default App;
