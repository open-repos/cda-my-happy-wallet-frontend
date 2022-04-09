import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import operationsFixesService from "../../services/operationsFixesService";
import { handleExceptionPayload } from "../../services/handleExceptionPayload";


const initialState = {
  charges: {
      data:[],
      isError:false,
      isSuccess:false,
      message: '',
  },
  revenus: {
    data:[],
    isError:false,
    isSuccess:false,
    message: '',
},
  isLoading: false,
};


// Revenus
export const revenusApi = createAsyncThunk(
  'operationsFixes/revenus',
  async (thunkAPI) => {
    try {
       const response = await  operationsFixesService.getAllRevenus()
       console.log(response)
       return response.data
    } catch (err) {
      const ErrorObjet = await handleExceptionPayload(error)
      console.log(ErrorObjet)
      return thunkAPI.rejectWithValue(ErrorObjet.message)
    }
  }
)
// Add Revenus
export const addRevenusApi = createAsyncThunk(
  'operationsFixes/addRevenus',
async (data,thunkAPI) => {
  try {
    const response = await operationsFixesService.postRevenus(data)
    console.log(response)
    return response.data
  } catch (error) {
    const ErrorObjet = await handleExceptionPayload(error)
    console.log(ErrorObjet)
    return thunkAPI.rejectWithValue(ErrorObjet.message)
  }
}
)

// Charges
export const chargesApi = createAsyncThunk(
    'operationsFixes/charges',
  async (thunkAPI) => {
    try {
      const response = await operationsFixesService.getAllCharges()
      console.log("LoadCharges",response)
      return response.data
    } catch (error) {
      const ErrorObjet = await handleExceptionPayload(error)
      console.log(ErrorObjet)
      return thunkAPI.rejectWithValue(ErrorObjet.message)
    }
  }
)

// Add Charges
export const addChargesApi = createAsyncThunk(
  'operationsFixes/addCharges',
async (data,thunkAPI) => {
  try {
    const response = await operationsFixesService.postCharges(data)
    console.log(response)
    return response.data
  } catch (error) {
    const ErrorObjet = await handleExceptionPayload(error)
    console.log(ErrorObjet)
    return thunkAPI.rejectWithValue(ErrorObjet.message)
  }
}
)


export const operationsFixesSlice = createSlice({
  name: "operationsFixes",
  initialState,
  reducers: {
    reset: (state) => {
      state.charges.isError = false
      state.charges.isSuccess = false
      state.charges.message = ''
      state.revenus.isError = false
      state.revenus.isSuccess = false
      state.revenus.message = ''
      state.isLoading=false
    },
  },
  extraReducers:(builder)=>{
    builder
      .addCase(revenusApi.pending, (state) => {
        state.isLoading = true
      })
      .addCase(revenusApi.fulfilled, (state, action) => {
        state.isLoading = false
        state.revenus.isSuccess = true
        state.revenus.data = action.payload.data
        state.revenus.message = action.payload.message
      })
      .addCase(revenusApi.rejected, (state, action) => {
        state.isLoading = false
        state.revenus.isError = true
        state.revenus.message = action.payload
        state.revenus.data = null
      }) 
      .addCase(chargesApi.pending, (state) => {
        state.isLoading = true
      })
      .addCase(chargesApi.fulfilled, (state, action) => {
        state.isLoading = false
        state.charges.isSuccess = true
        state.charges.data = action.payload.data
        state.charges.message = action.payload.message
      })
      .addCase(chargesApi.rejected, (state, action) => {
        state.isLoading = false
        state.charges.isError = true
        state.charges.message = action.payload
        state.charges.data = null
      })   
      .addCase(addChargesApi.pending, (state) => {
        state.isLoading = true
      })
      .addCase(addChargesApi.fulfilled, (state, action) => {
        console.log(action)
        console.log(action.payload.data)
        console.log(state.charges.data)
        state.isLoading = false
        state.charges.isSuccess = true
        state.charges.data.push(action.payload.data)
        state.charges.message = action.payload.message
      })
      .addCase(addChargesApi.rejected, (state, action) => {
        state.isLoading = false
        state.charges.isError = true
        state.charges.message = action.payload
      })   
      .addCase(addRevenusApi.pending, (state) => {
        state.isLoading = true
      })
      .addCase(addRevenusApi.fulfilled, (state, action) => {
        console.log(action)
        console.log(action.payload.data)
        console.log(state.revenus.data)
        state.isLoading = false
        state.revenus.isSuccess = true
        state.revenus.data.push(action.payload.data)
        state.revenus.message = action.payload.message
      })
      .addCase(addRevenusApi.rejected, (state, action) => {
        state.isLoading = false
        state.revenus.isError = true
        state.revenus.message = action.payload
      })  
  }
});

// Action creators are generated for each case reducer function
export const {reset } = operationsFixesSlice.actions;

export default operationsFixesSlice.reducer;
