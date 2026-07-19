import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import operationsFixesService from "../../services/operationsFixesService";
import { handleExceptionPayload } from "../../services/handleExceptionPayload";
import {
  getPayloadData,
  getPayloadMessage,
  toApiPayload,
} from "../../services/apiResponse.mjs";


const initialState = {
  restAVivre:{
    mois:0,
    semaine:0,
    jour:0
  },
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
       return toApiPayload(response)
    } catch (err) {
      const ErrorObjet = await handleExceptionPayload(error)
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
    return toApiPayload(response)
  } catch (error) {
    const ErrorObjet = await handleExceptionPayload(error)
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
      return toApiPayload(response)
    } catch (error) {
      const ErrorObjet = await handleExceptionPayload(error)
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
    return toApiPayload(response)
  } catch (error) {
    const ErrorObjet = await handleExceptionPayload(error)
    return thunkAPI.rejectWithValue(ErrorObjet.message)
  }
}
)

// RaV
// export const calculRaV = createAsyncThunk(
//   'operationsFixes/RaV',
//   async (charges,revenus,_) => {  const res = await operationsFixesService.calculRaV(charges,revenus)
//   }
 
// )

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
      state.restAVivre=initialState.restAVivre
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
        state.revenus.data = getPayloadData(action.payload)
        state.revenus.message = getPayloadMessage(action.payload)
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
        state.charges.data = getPayloadData(action.payload)
        state.charges.message = getPayloadMessage(action.payload)
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
        state.isLoading = false
        state.charges.isSuccess = true
        state.charges.data.push(getPayloadData(action.payload))
        state.charges.message = getPayloadMessage(action.payload)
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
        state.isLoading = false
        state.revenus.isSuccess = true
        state.revenus.data.push(getPayloadData(action.payload))
        state.revenus.message = getPayloadMessage(action.payload)
      })
      .addCase(addRevenusApi.rejected, (state, action) => {
        state.isLoading = false
        state.revenus.isError = true
        state.revenus.message = action.payload
      })  
      // .addCase(calculRaV.fulfilled, (state, action) => {
      //   state.restAVivre=action.date
      // })
  }
});

// Action creators are generated for each case reducer function
export const {reset } = operationsFixesSlice.actions;

export default operationsFixesSlice.reducer;
