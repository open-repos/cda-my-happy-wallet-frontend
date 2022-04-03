import React ,{useState, useEffect} from 'react'
import { chargesApi, revenusApi, reset } from '../slices/operationsFixes/operationsFixesSlice';
import { useDispatch,useSelector } from "react-redux";
import { toast } from 'react-toastify'

function Home() {

  // let navigate = useNavigate();
  // let location = useLocation();

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
      toastId.current = charges.message
      toast.error(charges.message)
      toastId.current == null
    }

    if (charges.isSuccess) {
     console.log("Success charges loaded")

    }

    // dispatch(reset())
  }, [charges.isError])

  useEffect(() => {
   
    dispatch(revenusApi())
    if (revenus.isError) {
      toastId.current = revenus.message
      toast.error(revenus.message)
      toastId.current == null
    }

    if (revenus.isSuccess) {
     console.log("Success revenus loaded")

    }

    // dispatch(reset())
  }, [revenus.isError])


  return (
    <div>Home</div>
  )
}

export default Home