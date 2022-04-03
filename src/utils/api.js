import axios from 'axios'
import { API_BASE_URL } from './constants'
// import jwt_decode from "jwt-decode";
// import dayjs from 'dayjs'
// import { setLocalStorageItem,getLocalStorageItem } from './localstorage';


//Nous créons une api axios afin de la ré-utiliser plus tard
//Pour ne pas à avoir à re renseigner l'url de base de notre api

// export async function authHeader() {
//   const auth = await getLocalStorageItem("auth");
//   console.log("user inside authHeader",auth)
//   if (auth && auth?.payload.accessToken) {
//     return { Authorization: 'Bearer ' + auth?.payload.accessToken };
//   } else {
//     return {};
//   }
// }

// const auth = getLocalStorageItem("auth");
// let accessToken =  ""
// if(auth){
//   console.log(auth)
//   accessToken =  auth.payload.accessToken
// }

// export const apiPrivate = axios.create({
//   baseURL: API_BASE_URL,
//   headers: {
//       "Content-type": "application/json",
//       "Authorization":`Bearer ${accessToken}`
//     }
// })

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        "Content-type": "application/json"
      }
})

// apiPrivate.interceptors.request.use( async req => {
//   // console.log("Interceptor ran")
//   // console.log('req.hasOwnProperty("headers")',req.hasOwnProperty("headers"))
//   // console.log('req.headers?.hasOwnProperty("Authorization")',req.headers?.hasOwnProperty("Authorization"))
//   // console.log("req.headers",req.headers)
//   let store = store 
//   console.log("Inside interceptor STORE",store)
//   //   const auth = store?.getState()?.auth?.auth
//   //   // const auth = getLocalStorageItem("auth");
//   //   // console.log("auth",auth)
//   //   if (auth && auth?.payload.accessToken) {

//   //     console.log("AVANT REHRESH : auth.payload.accessToken",auth.payload.accessToken)
//   //     let accessToken = auth.payload.accessToken
//   //     const email = auth.payload.user.email
//   //     const decodedToken = jwt_decode(accessToken)
//   //     // const isExpired = dayjs.unix(user.exp).diff(dayjs()) < 1;
//   //     const isExpired = decodedToken.exp * 1000 < currentDate.getTime()
  
//   //     if(!isExpired) return req
//   //     let body = {
//   //           grant_type: "refresh_token",
//   //           email: email
//   //       }
//   //     // const response = await userService.renewAccessToken(body,accessToken)
//   //     await store.dispatch(newRefreshToken({body,accessToken}))
      
//   //     // console.log("response",response)
//   //     // setLocalStorageItem(response.data,"auth")
//   //     // req.headers.Authorization = `Bearer ${response.data.payload.accessToken}`
//   //     let newAccessToken = store?.getState()?.auth?.auth.payload.accessToken
//   //     console.log("APRES REHRESH : auth.payload.accessToken",newAccessToken)
//   //     req.headers.Authorization = `Bearer ${newAccessToken}`
//   //     req.withCredentials = true
//   //     console.log("req",req)
//   //     return req
//   //   }
//   //   }
//   // }


//   return req
// })


// apiPrivate.interceptors.response.use( async res => {

//   console.log("res.status",res.status)
// return res
// },   async err => {
// console.log("Inside Interceptors : err", err)
// if (err.status >= 400){
//   console.log(err)
//   console.log(err.data.error.message)
//   console.log(err.data.error.status)
//   return res
// }})


export default api