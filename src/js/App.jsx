import React from 'react';
import './../css/App.css'
//auth
import { RequireAuth } from "./components/requireAuth";

//Components
import Sidebar from './components/SideBar'
//Pages
import Calendrier from './pages/Calendrier'
import ListeOperations from './pages/ListeOperations'
import Objectifs from './pages/Objectifs'
import Profil from './pages/Profil'
import Home from './pages/Home'
import NotFound from './pages/NotFound'
import Login from "./pages/Login"
import Register from "./pages/Register"
import ForgotPassword from "./pages/ForgotPassword"
import { Routes, Route, Navigate,useLocation } from "react-router-dom";
import NewPassword from './pages/NewPassword';


function ShowSideBar() {
  let location = useLocation();
  console.log(location)
  if (location.pathname == "/login" ||location.pathname == "/register" ||location.pathname == "/forgot-password"||location.pathname == "/new-password" ){
    return null;
  }
  return<Sidebar />;
}
function App() {

 return (
    <>
    <ShowSideBar/>
    <div className="App">
       <header></header>
      <main>
        <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/new-password" element={<NewPassword />} />
          <Route path="/" element={<Home />} />
          <Route path="/" element={<Navigate replace to="/dashboard" />} />
          {/* <Route path="enter-nickname" element={<NicknamePage />}></Route> */}
          {/* <Route
            path="/games"
            element={<Navigate replace to="/games/nickname" />}
          > */}
            <Route path="/calendrier" element={<Calendrier />}></Route>
            <Route
              path="/objectifs-evenements"
              element={<RequireAuth><Objectifs /></RequireAuth>}
            ></Route>
            <Route path="/operations" element={<RequireAuth><ListeOperations /></RequireAuth>}></Route>
            <Route path="/profil" element={<RequireAuth><Profil /></RequireAuth>}></Route>
          {/* </Route> */}
          <Route path="*" element={<NotFound />}></Route>
        </Routes>
      </main>
    </div>
    </>
  )
}

export default App
