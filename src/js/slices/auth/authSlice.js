import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
// import { gameApi } from "../../services/gameApi";
import userService from "../../services/user.service";

import {
  setLocalStorageItem,
  removeLocalStorageItem,
  getLocalStorageItem
} from "../../../utils/localstorage";


const user = getLocalStorageItem("user")
const initialState = {
  user: user ? user : null ,
  isAuthenticated: false,
  isError: false,
  isSuccess: false,
  isLoading: false,
  message: '',
};


// Register user
export const register = createAsyncThunk(
  'auth/register',
  async (user, thunkAPI) => {
    try {
      const message = await userService.register(user)
      console.log("outside userService",message)
      return thunkAPI.rejectWithValue(message)
    } catch (error) {
      console.log("outside userService",error)
      const message =
        (error.response &&
          error.response.data &&
          error.response.data.message) ||
        error.message ||
        error.toString()
      return thunkAPI.rejectWithValue(message)
    }
  }
)


export const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    reset: (state) => {
      state.isLoading = false
      state.isAuthenticated= false,
      state.isSuccess = false
      state.isError = false
      state.message = ''
    },
    logout: () => {
      removeLocalStorageItem("user"),
      initialState;
    },
    login: (state,action) => {
      // console.log("action.payload",action)
      state.user = action.payload;
      state.isAuthenticated = true;
      setLocalStorageItem(state.user , "user");
      // console.log("state.isAuthenticated",state.isAuthenticated)
    },
  },
  extraReducers:(builder)=>{
    builder
      .addCase(register.pending, (state) => {
        state.isLoading = true
      })
      .addCase(register.fulfilled, (state, action) => {
        state.isLoading = false
        state.isSuccess = true
        state.user = action.payload
      })
      .addCase(register.rejected, (state, action) => {
        state.isLoading = false
        state.isError = true
        state.message = action.payload
        state.user = null
      })
    
  }
});

// Action creators are generated for each case reducer function
export const { logout, login, reset } = authSlice.actions;

export default authSlice.reducer;
