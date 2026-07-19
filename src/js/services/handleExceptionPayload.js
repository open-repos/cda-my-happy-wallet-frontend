
import { InternalError, toApiErrorPayload } from "./apiResponse.mjs";

export { InternalError };

export const handleExceptionPayload = async (err) =>{
    return toApiErrorPayload(err);
}
