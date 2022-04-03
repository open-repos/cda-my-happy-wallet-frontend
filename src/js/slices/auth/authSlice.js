import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import userService from "../../services/userService";
import { useDispatch } from "react-redux";
import {
  getLocalStorageItem
} from "../../../utils/localstorage";
import { handleExceptionPayload } from "../../services/handleExceptionPayload";



// const dispatch = useDispatch()

const auth = getLocalStorageItem("auth")
const initialState = {
  auth: auth ? auth : null ,
  isAuthenticated: false,
  isError: false,
  isSuccess: false,
  isSuccessConfirmNewPassword:false,
  isEmailSent: false,
  isLoading: false,
  message: '',
};


// Register user
export const register = createAsyncThunk(
  'auth/register',
  async (user, thunkAPI) => {
    try {
       await userService.register(user)
    } catch (err) {
      const ErrorObjet = await handleExceptionPayload(error)
      return thunkAPI.rejectWithValue(ErrorObjet.message)
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
      const ErrorObjet = await handleExceptionPayload(error)
      return thunkAPI.rejectWithValue(ErrorObjet.message)
    }
  }
)

// ForgotPassword
export const forgotPsswdApi = createAsyncThunk(
  'auth/forgotPassword',
  async (user, thunkAPI) => {
    try {
      const response = await userService.resetPasswordPost(user)
      console.log(response)
      return response.data
    } catch (error) {
      const ErrorObjet = await handleExceptionPayload(error)
      return thunkAPI.rejectWithValue(ErrorObjet.message)
    }
  }
)

// Forgot user
export const resetPsswdApi = createAsyncThunk(
  'auth/resetPassword',
  async (token, thunkAPI) => {
    try {
      const response = await userService.resetPasswordGet(token)
      console.log(response)
      return response.data
    } catch (error) {
      const ErrorObjet = await handleExceptionPayload(error)
      return thunkAPI.rejectWithValue(ErrorObjet.message)
    }
  }
)

//New Password
export const newPsswdApi = createAsyncThunk(
  'auth/newPassword',
  async (body, thunkAPI) => {
    try {
      const response = await userService.newPassword(body)
      console.log(response)
      return response.data
    } catch (error) {
      const ErrorObjet = await handleExceptionPayload(error)
      return thunkAPI.rejectWithValue(ErrorObjet.message)
    }
  }
)

//New Refresh Token
export const newRefreshToken = createAsyncThunk(
  'auth/renewAccessToken',
  async (bodyAccessToken, thunkAPI) => {
    try {

      const {body, accessToken} = bodyAccessToken
      const response = await userService.renewAccessToken(body,accessToken)
      console.log(response)
      return response.data
    } catch (error) {
      const ErrorObjet = await handleExceptionPayload(error)
      // await userService.logout()
      return thunkAPI.rejectWithValue(ErrorObjet.message)
    }
  }
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
        state.auth = action.payload
      })
      .addCase(register.rejected, (state, action) => {
        state.isLoading = false
        state.isError = true
        state.message = action.payload
        state.auth = null
      })
      .addCase(loginApi.pending, (state) => {
        state.isLoading = true
      })
      .addCase(loginApi.fulfilled, (state, action) => {
        state.isLoading = false
        state.isSuccess = true
        state.isAuthenticated= true,
        state.auth = action.payload
      })
      .addCase(loginApi.rejected, (state, action) => {
        state.isLoading = false,
        state.isError = true,
        state.isAuthenticated= false,
        state.message = action.payload
        state.auth = null
      })
      .addCase(forgotPsswdApi.pending, (state) => {
        state.isLoading = true
      })
      .addCase(forgotPsswdApi.fulfilled, (state,action) => {
        state.isLoading = false
        state.isEmailSent= true
        state.message = action.payload.message
      })
      .addCase(forgotPsswdApi.rejected, (state, action) => {
        state.isLoading = false,
        state.isError = true,
        state.message = action.payload
      })
      .addCase(resetPsswdApi.pending, (state) => {
        state.isLoading = true
      })
      .addCase(resetPsswdApi.fulfilled, (state,action) => {
        state.isLoading = false
        state.message = action.payload.message
      })
      .addCase(resetPsswdApi.rejected, (state, action) => {
        state.isLoading = false,
        state.isError = true,
        state.message = action.payload
      })
      .addCase(newPsswdApi.pending, (state) => {
        state.isLoading = true
      })
      .addCase(newPsswdApi.fulfilled, (state,action) => {
        state.isLoading = false
        state.isSuccessConfirmNewPassword=true
        state.message = action.payload.message
      })
      .addCase(newPsswdApi.rejected, (state, action) => {
        state.isLoading = false,
        state.isError = true,
        state.message = action.payload
      })
      .addCase(newRefreshToken.pending, (state) => {
        state.isLoading = true
      })
      .addCase(newRefreshToken.fulfilled, (state, action) => {
        state.isLoading = false
        state.isSuccess = true
        state.isAuthenticated= true,
        state.auth = action.payload
      })
      .addCase(newRefreshToken.rejected, (state, action) => {
        state.isLoading = false,
        state.isError = true,
        state.isAuthenticated= false,
        state.message = action.payload
        state.auth = null
      })
      .addCase(logout.fulfilled, (state) => {
        state.auth = null
        state.isAuthenticated= false
      })
    
  }
});

// Action creators are generated for each case reducer function
export const {reset } = authSlice.actions;

export default authSlice.reducer;
