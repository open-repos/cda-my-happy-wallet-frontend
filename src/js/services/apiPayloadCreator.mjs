import { toApiErrorPayload, toApiPayload } from "./apiResponse.mjs";

export const createApiPayloadCreator = ({
  request,
  mapResponse = toApiPayload,
  mapError = toApiErrorPayload,
}) => {
  return async (argument, thunkApi) => {
    try {
      return mapResponse(await request(argument));
    } catch (error) {
      return thunkApi.rejectWithValue(mapError(error));
    }
  };
};
