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
       await userService.register(user)
    } catch (error) {
      const message = error.response.data.error.message
      return thunkAPI.rejectWithValue(message)
    }
  }
)

// Login user
export const loginApi = createAsyncThunk(
  'auth/login',
  async (user, thunkAPI) => {
    try {
      const response = await userService.login(user)
      console.log(response)
      return response
    } catch (error) {
      console.log("error",error.response.data)
      const message = error.response.data.error.message
      return thunkAPI.rejectWithValue(message)
    }
  }
)

export const logout = createAsyncThunk(
  'auth/logout',
  async () => {  await userService.logout()
  }
)


export const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    reset: (state) => {
      state.isLoading = false
      state.isSuccess = false
      state.isError = false
      state.message = ''
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
      .addCase(loginApi.pending, (state) => {
        state.isLoading = true
      })
      .addCase(loginApi.fulfilled, (state, action) => {
        state.isLoading = false
        state.isSuccess = true
        state.isAuthenticated= true,
        state.user = action.payload
      })
      .addCase(loginApi.rejected, (state, action) => {
        state.isLoading = false,
        state.isError = true,
        state.isAuthenticated= false,
        state.message = action.payload
        state.user = null
      })
      .addCase(logout.fulfilled, (state) => {
        state.user = null
      })
    
  }
});

// Action creators are generated for each case reducer function
export const {reset } = authSlice.actions;

export default authSlice.reducer;
