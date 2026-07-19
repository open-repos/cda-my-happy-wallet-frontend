import assert from "assert";
import { createRevenusApiPayloadCreator } from "../src/js/services/revenusApiPayloadCreator.mjs";

const apiResponse = {
  data: {
    success: true,
    message: "Revenus loaded",
    data: [{ id: 1 }],
  },
};

const successfulPayloadCreator = createRevenusApiPayloadCreator({
  operationsFixesService: {
    getAllRevenus: async () => apiResponse,
  },
  handleExceptionPayload: async () => {
    throw new Error("Error mapper must not run on success");
  },
  toApiPayload: (response) => response.data,
});

assert.deepStrictEqual(
  await successfulPayloadCreator(undefined, {}),
  apiResponse.data
);

const serviceError = new Error("Revenue service unavailable");
let mappedError;
const rejectedPayloadCreator = createRevenusApiPayloadCreator({
  operationsFixesService: {
    getAllRevenus: async () => {
      throw serviceError;
    },
  },
  handleExceptionPayload: async (error) => {
    mappedError = error;
    return { message: "Revenue service unavailable" };
  },
  toApiPayload: () => {
    throw new Error("Payload mapper must not run on failure");
  },
});

const rejection = await rejectedPayloadCreator(undefined, {
  rejectWithValue: (message) => ({ rejectedWith: message }),
});

assert.strictEqual(mappedError, serviceError);
assert.deepStrictEqual(rejection, {
  rejectedWith: "Revenue service unavailable",
});
