import { configureStore,  
  combineReducers,
  getDefaultMiddleware } from "@reduxjs/toolkit";

import authReducer from "../slices/auth/authSlice";
import operationsReducer from "../slices/operationsFixes/operationsFixesSlice";


const combinedReducer = combineReducers({
  auth:authReducer,
  operationsFixes:operationsReducer
});

const rootReducer = (state, action) => {
  console.log("action.type",action.type)
  if (action.type === 'auth/logout/fulfilled') {
    state = undefined;
  }
  return combinedReducer(state, action);
};

export default configureStore({
  reducer: rootReducer,
  middleware: [...getDefaultMiddleware()]
});
