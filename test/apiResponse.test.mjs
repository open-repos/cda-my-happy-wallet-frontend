import assert from "assert";
import {
  getPayloadData,
  getPayloadMessage,
  InternalError,
  toApiErrorPayload,
  toApiPayload,
} from "../src/js/services/apiResponse.mjs";

const axiosLikeResponse = {
  data: {
    success: true,
    message: "Operation complete",
    data: [{ id: 1 }],
  },
};

const payload = toApiPayload(axiosLikeResponse);

assert.deepStrictEqual(payload, axiosLikeResponse.data);
assert.deepStrictEqual(getPayloadData(payload), [{ id: 1 }]);
assert.strictEqual(getPayloadMessage(payload), "Operation complete");

assert.deepStrictEqual(
  toApiErrorPayload({
    response: {
      status: 401,
      data: {
        error: {
          message: "Unauthorized",
        },
      },
    },
  }),
  {
    message: "Unauthorized",
    code: 401,
  }
);

assert.deepStrictEqual(toApiErrorPayload(null), InternalError);
assert.strictEqual(toApiPayload(undefined), undefined);
