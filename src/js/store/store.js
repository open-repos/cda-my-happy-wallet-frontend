import { configureStore } from "@reduxjs/toolkit";
// import logger from "redux-logger";

// //Services
// import { gameApi } from "../services/gameApi";
//Features
import authReducer from "../slices/auth/authSlice";


const reducer = {
  // [gameApi.reducerPath]: gameApi.reducer,
  auth:authReducer,
}

export const store = configureStore({
  reducer,
  // middleware: (getDefaultMiddleware) =>
  //   getDefaultMiddleware().concat(
  //     gameApi.middleware,
  //     logger
  //   ), // A ajouter peopleApi.middleware
});
