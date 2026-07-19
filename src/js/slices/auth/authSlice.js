import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import userService from "../../services/userService";
import {
  getLocalStorageItem, removeLocalStorageItem
} from "../../../utils/localstorage";
import { getPayloadMessage } from "../../services/apiResponse.mjs";
import { createApiPayloadCreator } from "../../services/apiPayloadCreator.mjs";



// const dispatch = useDispatch()

const user = getLocalStorageItem("user")
const initialState = {
  user: user ? user : null ,
  isAuthenticated: false,
  isError: false,
  isSuccess: false,
  isSuccessConfirmNewPassword:false,
  isEmailSent: false,
  isLoading: false,
  message: '',
  error: null,
};


// Register user
export const register = createAsyncThunk(
  'auth/register',
  createApiPayloadCreator({ request: (user) => userService.register(user) })
)

// Login user
export const loginApi = createAsyncThunk(
  'auth/login',
  createApiPayloadCreator({
    request: (user) => userService.login(user),
    mapResponse: (response) => response,
  })
)

// ForgotPassword
export const forgotPsswdApi = createAsyncThunk(
  'auth/forgotPassword',
  createApiPayloadCreator({ request: (user) => userService.resetPasswordPost(user) })
)

// Forgot user
export const resetPsswdApi = createAsyncThunk(
  'auth/resetPassword',
  createApiPayloadCreator({ request: (token) => userService.resetPasswordGet(token) })
)

//New Password
export const newPsswdApi = createAsyncThunk(
  'auth/newPassword',
  createApiPayloadCreator({ request: (body) => userService.newPassword(body) })
)

//New Refresh Token
export const newRefreshToken = createAsyncThunk(
  'auth/renewAccessToken',
  createApiPayloadCreator({
    request: (bodyAccessToken) => {
      const {body, accessToken} = bodyAccessToken
      return userService.renewAccessToken(body,accessToken)
    },
  })
)

// Logout
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
      state.isEmailSent= false,
      state.isSuccessConfirmNewPassword=false
      state.message = ''
      state.error = null
    },
  },
  extraReducers:(builder)=>{
    builder
      .addCase(register.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(register.fulfilled, (state, action) => {
        state.isLoading = false
        state.isSuccess = true
        state.user = action.payload
      })
      .addCase(register.rejected, (state, action) => {
        state.isLoading = false
        state.isError = true
        state.error = action.payload
        state.message = action.payload?.message || "Registration failed"
        state.user = null
      })
      .addCase(loginApi.pending, (state) => {
        state.isLoading = true
        state.error = null
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
        state.error = action.payload
        state.message = action.payload?.message || "Login failed"
        state.user = null
      })
      .addCase(forgotPsswdApi.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(forgotPsswdApi.fulfilled, (state,action) => {
        state.isLoading = false
        state.isEmailSent= true
        state.message = getPayloadMessage(action.payload)
      })
      .addCase(forgotPsswdApi.rejected, (state, action) => {
        state.isLoading = false,
        state.isError = true,
        state.error = action.payload
        state.message = action.payload?.message || "Password reset request failed"
      })
      .addCase(resetPsswdApi.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(resetPsswdApi.fulfilled, (state,action) => {
        state.isLoading = false
        state.message = getPayloadMessage(action.payload)
      })
      .addCase(resetPsswdApi.rejected, (state, action) => {
        state.isLoading = false,
        state.isError = true,
        state.error = action.payload
        state.message = action.payload?.message || "Password reset failed"
      })
      .addCase(newPsswdApi.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(newPsswdApi.fulfilled, (state,action) => {
        state.isLoading = false
        state.isSuccessConfirmNewPassword=true
        state.message = getPayloadMessage(action.payload)
      })
      .addCase(newPsswdApi.rejected, (state, action) => {
        state.isLoading = false,
        state.isError = true,
        state.error = action.payload
        state.message = action.payload?.message || "Password update failed"
      })
      .addCase(newRefreshToken.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(newRefreshToken.fulfilled, (state, action) => {
        state.isLoading = false
        state.isSuccess = true
        state.isAuthenticated= true,
        state.user = action.payload
      })
      .addCase(newRefreshToken.rejected, (state, action) => {
        removeLocalStorageItem("user")
        state.isLoading = false,
        state.isError = true,
        state.isAuthenticated= false,
        state.error = action.payload
        state.message = action.payload?.message || "Session renewal failed"
        state.user = null
      })
      .addCase(logout.fulfilled, (state) => {
        state.user = null
        state.isAuthenticated= false
      })
    
  }
});

// Action creators are generated for each case reducer function
export const {reset } = authSlice.actions;

export default authSlice.reducer;
