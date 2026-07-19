export const InternalError = {
  type: "UnknownError",
  message: "Internal error during request",
  code: 500,
  path: null,
  details: null,
};

export const NetworkError = {
  type: "NetworkError",
  message: "Unable to reach the server",
  code: 0,
  path: null,
  details: null,
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

  const apiError = err.response?.data?.error;

  if (apiError && typeof apiError === "object") {
    return {
      type: apiError.type || "HttpError",
      message: apiError.message || InternalError.message,
      code: apiError.statusCode || err.response.status || 500,
      path: apiError.path || null,
      details: apiError.details || null,
    };
  }

  if (err.request && !err.response) {
    return NetworkError;
  }

  return InternalError;
};
