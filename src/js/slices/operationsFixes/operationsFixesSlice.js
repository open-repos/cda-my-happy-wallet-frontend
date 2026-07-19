import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import operationsFixesService from "../../services/operationsFixesService";
import {
  getPayloadData,
  getPayloadMessage,
} from "../../services/apiResponse.mjs";
import { createApiPayloadCreator } from "../../services/apiPayloadCreator.mjs";


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
      error: null,
  },
  revenus: {
    data:[],
    isError:false,
    isSuccess:false,
    message: '',
    error: null,
},
  isLoading: false,
};


// Revenus
export const revenusApi = createAsyncThunk(
  'operationsFixes/revenus',
  createApiPayloadCreator({ request: () => operationsFixesService.getAllRevenus() })
)
// Add Revenus
export const addRevenusApi = createAsyncThunk(
  'operationsFixes/addRevenus',
  createApiPayloadCreator({ request: (data) => operationsFixesService.postRevenus(data) })
)

// Charges
export const chargesApi = createAsyncThunk(
    'operationsFixes/charges',
  createApiPayloadCreator({ request: () => operationsFixesService.getAllCharges() })
)

// Add Charges
export const addChargesApi = createAsyncThunk(
  'operationsFixes/addCharges',
  createApiPayloadCreator({ request: (data) => operationsFixesService.postCharges(data) })
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
      state.charges.error = null
      state.revenus.isError = false
      state.revenus.isSuccess = false
      state.revenus.message = ''
      state.revenus.error = null
      state.isLoading=false
      state.restAVivre=initialState.restAVivre
    },
  },
  extraReducers:(builder)=>{
    builder
      .addCase(revenusApi.pending, (state) => {
        state.isLoading = true
        state.revenus.error = null
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
        state.revenus.error = action.payload
        state.revenus.message = action.payload?.message || "Unable to load revenus"
        state.revenus.data = null
      }) 
      .addCase(chargesApi.pending, (state) => {
        state.isLoading = true
        state.charges.error = null
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
        state.charges.error = action.payload
        state.charges.message = action.payload?.message || "Unable to load charges"
        state.charges.data = null
      })   
      .addCase(addChargesApi.pending, (state) => {
        state.isLoading = true
        state.charges.error = null
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
        state.charges.error = action.payload
        state.charges.message = action.payload?.message || "Unable to add charge"
      })   
      .addCase(addRevenusApi.pending, (state) => {
        state.isLoading = true
        state.revenus.error = null
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
        state.revenus.error = action.payload
        state.revenus.message = action.payload?.message || "Unable to add revenu"
      })  
      // .addCase(calculRaV.fulfilled, (state, action) => {
      //   state.restAVivre=action.date
      // })
  }
});

// Action creators are generated for each case reducer function
export const {reset } = operationsFixesSlice.actions;

export default operationsFixesSlice.reducer;
