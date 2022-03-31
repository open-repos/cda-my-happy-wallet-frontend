import { configureStore } from "@reduxjs/toolkit";
// import logger from "redux-logger";

// //Services
// import { gameApi } from "../services/gameApi";
//Features
import auth from "../slices/authSlice";


const reducer = {
  // [gameApi.reducerPath]: gameApi.reducer,
  auth:auth,
}

export const store = configureStore({
  reducer,
  // middleware: (getDefaultMiddleware) =>
  //   getDefaultMiddleware().concat(
  //     gameApi.middleware,
  //     logger
  //   ), // A ajouter peopleApi.middleware
});
