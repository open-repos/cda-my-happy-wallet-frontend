
import { InternalError, toApiErrorPayload } from "./apiResponse.mjs";

export { InternalError };

export const handleExceptionPayload = async (err) =>{
    console.log("inside handleException", err)
    if (typeof err === "object" && err && err.hasOwnProperty("response")) {
        console.log("inside handleException", err.response)
    }
    return toApiErrorPayload(err);
}
