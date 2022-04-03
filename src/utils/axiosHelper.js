import axios from "axios";
import { API_BASE_URL } from "./constants";
import jwt_decode from "jwt-decode";
// import dayjs from 'dayjs'

import { newRefreshToken } from "../js/slices/auth/authSlice";
import { setLocalStorageItem, getLocalStorageItem } from "./localstorage";


const apiPrivate = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-type": "application/json",
  },
});

const setUpInterceptors = (store) => {
  apiPrivate.interceptors.request.use(async (req) => {
    console.log("Inside interceptor AXIOS");
    const auth = store?.getState()?.auth?.auth;
    const authStorage = getLocalStorageItem("auth");
    let currentDate = new Date();
    console.log("State auth inteceptor ",auth)
    console.log("Storage auth inteceptor ",authStorage)
    if (auth && auth?.payload.accessToken) {
      console.log(
        "AVANT REHRESH : auth.payload.accessToken",
        auth.payload.accessToken
      );
      let accessToken = auth.payload.accessToken;
      req.headers.Authorization = `Bearer ${accessToken}`;
      const email = auth.payload.user.email;
      const decodedToken = jwt_decode(accessToken);
      // const isExpired = dayjs.unix(user.exp).diff(dayjs()) < 1;
      const isExpired = decodedToken.exp * 1000 < currentDate.getTime();
    
      console.log("is Token Expired ?",isExpired)
      if (!isExpired) return req;
      let body = {
        grant_type: "refresh_token",
        email: email,
      };
      // const response = await userService.renewAccessToken(body,accessToken)
      await store.dispatch(newRefreshToken({ body, accessToken }));
      console.log("juste apres dispatch newrefresh interceptor")
      console.log("store",store)
      console.log("store?.getState()?.auth",store?.getState().auth)
      console.log("store?.getState().auth.auth",store?.getState().auth.auth)
      // console.log("response",response)
      // setLocalStorageItem(response.data,"auth")
      // req.headers.Authorization = `Bearer ${response.data.payload.accessToken}`
      let newAccessToken = store?.getState()?.auth?.auth.payload.accessToken;
      console.log("APRES REHRESH : auth.payload.accessToken", newAccessToken);
      req.headers.Authorization = `Bearer ${newAccessToken}`;
      req.withCredentials = true;
      console.log("req", req);
      return req;
    }

    //   }
    // }

    return req;
  }, (error) => {
    console.log("INSIDE ERROR REQUEST INTERCEPTOR")
      console.log(Promise.reject(error))
    return Promise.reject(error);
  });

  apiPrivate.interceptors.response.use(
    async (res) => {
      console.log("res.status", res.status);
      return res;
    },
    async (err) => {
      console.log("INSIDE ERROR RESPONSE INTERCEPTOR")
    //   console.log(Promise.resolve(err))
      console.log(Promise.reject(err))
      return Promise.reject(err);
    }
  );
};

export { apiPrivate, setUpInterceptors };
