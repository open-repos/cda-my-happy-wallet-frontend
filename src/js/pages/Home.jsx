import React from "react";
import "../../css/Home.css";
import CaseOpFixeEmpty from "../components/HomeComponents/CaseOpFixeEmpty";
import CaseShowRaV from "../components/HomeComponents/CaseShowRaV";
import { useOperationsFixes } from "../hooks/useOperationsFixes";
function Home() {
  // let navigate = useNavigate();
  // let location = useLocation();
  // let from = location.state?.from?.pathname || location.state?.pathname  || "/";
  // const search = useLocation().search;
  const { isEmptyOpFixe } = useOperationsFixes();

  return (
    <>
      {isEmptyOpFixe ? (
        <CaseOpFixeEmpty />
      ) : (
       <CaseShowRaV/>
      )}
    </>
  );
}

export default Home;
