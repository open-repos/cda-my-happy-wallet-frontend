export const InternalError = {
  message: "Internal error during request",
  code: 500,
};

export const toApiPayload = (response) => {
  return response?.data;
};

export const getPayloadData = (payload) => {
  return payload?.data;
};

export const getPayloadMessage = (payload) => {
  return payload?.message;
};

export const toApiErrorPayload = (err) => {
  if (typeof err !== "object" || !err) {
    return InternalError;
  }

  if (err.hasOwnProperty("response") && err.response?.hasOwnProperty("data")) {
    return {
      message: err.response.data.error.message,
      code: err.response.status,
    };
  }

  return InternalError;
};
