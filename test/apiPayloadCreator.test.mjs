import assert from "assert";
import { createApiPayloadCreator } from "../src/js/services/apiPayloadCreator.mjs";

const response = { data: { success: true, data: [{ id: 1 }] } };
const successfulCreator = createApiPayloadCreator({
  request: async (argument) => {
    assert.strictEqual(argument, "input");
    return response;
  },
});

assert.deepStrictEqual(await successfulCreator("input", {}), response.data);

const apiFailure = {
  response: {
    status: 400,
    data: {
      error: {
        type: "IncompleteRequestBody",
        message: "Invalid password",
        path: "/users/register",
        statusCode: 400,
      },
    },
  },
};
const failingCreator = createApiPayloadCreator({
  request: async () => {
    throw apiFailure;
  },
});
const rejection = await failingCreator(undefined, {
  rejectWithValue: (error) => ({ rejectedWith: error }),
});

assert.deepStrictEqual(rejection.rejectedWith, {
  type: "IncompleteRequestBody",
  message: "Invalid password",
  code: 400,
  path: "/users/register",
  details: null,
});
