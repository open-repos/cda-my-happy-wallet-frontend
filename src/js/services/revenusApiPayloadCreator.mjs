export const createRevenusApiPayloadCreator = ({
  operationsFixesService,
  handleExceptionPayload,
  toApiPayload,
}) => {
  return async (_, thunkApi) => {
    try {
      const response = await operationsFixesService.getAllRevenus();
      return toApiPayload(response);
    } catch (error) {
      const errorPayload = await handleExceptionPayload(error);
      return thunkApi.rejectWithValue(errorPayload.message);
    }
  };
};
