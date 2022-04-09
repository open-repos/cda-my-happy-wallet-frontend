import React ,{useState, useEffect} from 'react'
import { chargesApi, revenusApi } from '../slices/operationsFixes/operationsFixesSlice';
import { useDispatch,useSelector } from "react-redux";
import "../../css/Home.css"
import CaseOpFixeEmpty from '../components/CaseOpFixeEmpty';



function Home() {

  // let navigate = useNavigate();
  // let location = useLocation();
  const [isEmptyOpFixe, setEmptyOpFixe] = useState(true)
  // let from = location.state?.from?.pathname || location.state?.pathname  || "/";
  // const search = useLocation().search;
  const toastId = React.useRef(null);
  const dispatch = useDispatch();


 

  const { charges, revenus, isLoading } = useSelector(
    (state) => state.operationsFixes
  )

  useEffect(() => {
   
    dispatch(chargesApi())
    if (charges.isError) {
      console.log("ERROR INSIDE HOME")
      // toastId.current = charges.message
      // toast.error(charges.message)
      // toastId.current == null
    }

    if (charges.isSuccess) {
     console.log("Success charges loaded")
     if(charges.hasOwnProperty("data") &&revenus.hasOwnProperty("data")){
      console.log("charges.data",charges.data)
      console.log("revenus.data",revenus.data)
      if(charges.data.length==0 || revenus.data.length==0){
        setEmptyOpFixe(true)
        return
      }else{
       setEmptyOpFixe(false)
      }
      if (charges.data ==null || revenus.data ==null ){
        setEmptyOpFixe(true)
      }else{
       setEmptyOpFixe(false)
       return
      }
     }
    }

    // dispatch(reset())
  }, [charges.isError,charges.isSuccess])

  useEffect(() => {
   
    dispatch(revenusApi())
    if (revenus.isError) {
      console.log("ERROR INSIDE HOME")
      // toastId.current = revenus.message
      // toast.error(revenus.message)
      // toastId.current == null
    }

    if (revenus.isSuccess) {
     console.log("Success revenus loaded")
     if(charges.hasOwnProperty("data") &&revenus.hasOwnProperty("data")){
      console.log("charges.data",charges.data)
      console.log("revenus.data",revenus.data)
      if(charges.data.length==0 || revenus.data.length==0){
        setEmptyOpFixe(true)
        return
      }else{
       setEmptyOpFixe(false)
      }
      if (charges.data ==null || revenus.data ==null ){
        
        setEmptyOpFixe(true)
      }else{
       setEmptyOpFixe(false)
       return
      }

     }

     
    
    }

    // dispatch(reset())
  }, [revenus.isError,revenus.isSuccess])


  return (
<>
    {isEmptyOpFixe ? <CaseOpFixeEmpty/> : null}
    </>
    // <div className='home-container'>
    // <h1>Home</h1>
    // <div className="charge-revenu-container">
    // <CardOperationFixe name={"Mes charges"} src={imgCharges}/>
    // <CardOperationFixe name={"Mes revenus"} src={imgRevenus}/>
    // </div>
    // </div>
  )
}

export default Home