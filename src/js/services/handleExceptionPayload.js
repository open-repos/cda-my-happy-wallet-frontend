
export const InternalError = {
    message: 'Internal error during request',
    code: 500
}


export const handleExceptionPayload = async (err) =>{
    if (typeof err !== "object" || !err){
        return InternalError
    }

    console.log("inside handleException", err)
    if (err.hasOwnProperty("response"))
    {
        console.log("inside handleException", err.response)
        if (err.response.hasOwnProperty("data")){
            return {
                message : err.response.data.error.message,
                code: err.response.status,
            }
        }
        
    }
    return InternalError;
}