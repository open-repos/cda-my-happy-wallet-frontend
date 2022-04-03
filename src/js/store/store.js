import { configureStore } from "@reduxjs/toolkit";

import authReducer from "../slices/auth/authSlice";
import operationsReducer from "../slices/operationsFixes/operationsFixesSlice";


const reducer = {
  auth:authReducer,
  operationsFixes:operationsReducer
}

export const store = configureStore({
  reducer,
  // middleware: (getDefaultMiddleware) =>
  //   getDefaultMiddleware().concat(
  //     gameApi.middleware,
  //     logger
  //   ), // A ajouter peopleApi.middleware
});
