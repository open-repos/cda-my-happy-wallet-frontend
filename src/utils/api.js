import axios from 'axios'
import { API_BASE_URL } from './constants'
import jwt_decode from "jwt-decode";
import dayjs from 'dayjs'
import { setLocalStorageItem,getLocalStorageItem } from './localstorage';
import userService from '../js/services/userService';
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

const auth = getLocalStorageItem("auth");
let accessToken =  ""
if(auth){
  console.log(auth)
  accessToken =  auth.payload.accessToken
}

export const apiPrivate = axios.create({
  baseURL: API_BASE_URL,
  headers: {
      "Content-type": "application/json",
      "Authorization":`Bearer ${accessToken}`
    }
})

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        "Content-type": "application/json"
      }
})

apiPrivate.interceptors.request.use( async req => {
  // console.log("Interceptor ran")
  // console.log('req.hasOwnProperty("headers")',req.hasOwnProperty("headers"))
  // console.log('req.headers?.hasOwnProperty("Authorization")',req.headers?.hasOwnProperty("Authorization"))
  // console.log("req.headers",req.headers)

    const auth = getLocalStorageItem("auth");
    // console.log("auth",auth)
    if (auth && auth?.payload.accessToken) {

      let accessToken = auth.payload.accessToken
      const email = auth.payload.user.email
      const user = jwt_decode(accessToken)
      const isExpired = dayjs.unix(user.exp).diff(dayjs()) < 1;
  
      if(!isExpired) return req
      let body = {
            grant_type: "refresh_token",
            email: email
        }
      const response = await userService.renewAccessToken(body,accessToken)
      // const response = await axios.post(`${API_BASE_URL}/token`, {
      //     grant_type: "refresh_token",
      //     email: email
        
      //   });
      console.log("response",response)
      setLocalStorageItem(response.data,"auth")
      // localStorage.setItem('authTokens', JSON.stringify(response.data))
      req.headers.Authorization = `Bearer ${response.data.payload.accessToken}`
      req.withCredentials = true
      console.log("req",req)
      return req
    }
  //   }
  // }


  return req
})


apiPrivate.interceptors.response.use( async res => {

  console.log("res.status",res.status)
  if (res.status >= 400){
    console.log(res)
    console.log(res.data.error.message)
    console.log(res.data.error.status)
    return res
  }
return res
})


export default api