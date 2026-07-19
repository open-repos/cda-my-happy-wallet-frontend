import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  chargesApi,
  revenusApi,
} from "../slices/operationsFixes/operationsFixesSlice";

export const useOperationsFixes = () => {
  const [isEmptyOpFixe, setEmptyOpFixe] = useState(true);
  const dispatch = useDispatch();
  const { charges, revenus, isLoading } = useSelector(
    (state) => state.operationsFixes
  );

  useEffect(() => {
    dispatch(chargesApi());
    dispatch(revenusApi());

    if (charges.isSuccess || revenus.isSuccess) {
      if (charges.hasOwnProperty("data") && revenus.hasOwnProperty("data")) {
        if (charges.data == null && revenus.data == null) {
          setEmptyOpFixe(true);
        } else if (charges.data.length == 0 && revenus.data == 0) {
          setEmptyOpFixe(true);
        } else {
          setEmptyOpFixe(false);
        }
      }
    }
  }, [charges.isError, charges.isSuccess]);

  return {
    charges,
    revenus,
    isLoading,
    isEmptyOpFixe,
  };
};
