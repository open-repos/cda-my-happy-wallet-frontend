import { createSlice } from "@reduxjs/toolkit";
// import { gameApi } from "../../services/gameApi";

import {
  setLocalStorageItem,
  removeLocalStorageItem,
  getLocalStorageItem
} from "../../utils/localstorage";


const user = getLocalStorageItem("user")
const initialState = {
  user: user ? user : null ,
  isAuthenticated: false,
  isLoading: false,
};

export const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    logout: () => {
      initialState, removeLocalStorageItem("user");
    },
    login: (state,action) => {
      // console.log("action.payload",action)
      state.user = action.payload;
      state.isAuthenticated = true;
      setLocalStorageItem(state.user , "user");
      // console.log("state.isAuthenticated",state.isAuthenticated)
    },
  },
  extraReducers:()=>{
    
  }
});

// Action creators are generated for each case reducer function
export const { logout, login } = authSlice.actions;

export default authSlice.reducer;
