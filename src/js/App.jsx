import React from "react";
import "./../css/App.css";
//auth
import { RequireAuth } from "./components/requireAuth";
import { ToastContainer } from "react-toastify";
//Components
import Sidebar from "./components/SideBar";
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
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import NewPassword from "./pages/NewPassword";
import 'react-toastify/dist/ReactToastify.css';

// function ShowSideBar() {
//   let location = useLocation();
//   // console.log(location);
//   if (
//     location.pathname == "/login" ||
//     location.pathname == "/register" ||
//     location.pathname == "/forgot-password" ||
//     location.pathname == "/new-password"
//   ) {
//     return null;
//   }
//   return <Sidebar />;
// }
function App() {
  return (
    <>
      {/* <ShowSideBar /> */}
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
            
            <Route path="home" element={<RequireAuth><Sidebar /><Home /> </RequireAuth>} />
            <Route path="/" element={ <Navigate replace to="/home" />} />
            {/* <Route path="/" element={<Navigate to="/home" replace />} /> */}
            
            {/* <Route path="enter-nickname" element={<NicknamePage />}></Route> */}
            {/* <Route
            path="/games"
            element={<Navigate replace to="/games/nickname" />}
          > */}
            <Route path="/calendrier" element={<RequireAuth><Sidebar /><Calendrier /></RequireAuth>}></Route>
            <Route
              path="/objectifs-evenements"
              element={
                <RequireAuth>
                  <Sidebar />
                  <Objectifs />
                </RequireAuth>
              }
            ></Route>
            <Route
              path="/operations"
              element={
                <RequireAuth>
                  <Sidebar />
                  <ListeOperations />
                </RequireAuth>
              }
            ></Route>
            <Route
              path="/profil"
              element={
                <RequireAuth>
                  <Sidebar />
                  <Profil />
                </RequireAuth>
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
