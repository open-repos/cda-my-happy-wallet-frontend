import axios from "axios";
import { API_BASE_URL } from "./constants";
import jwt_decode from "jwt-decode";

import { newRefreshToken } from "../js/slices/auth/authSlice";
import { getLocalStorageItem } from "./localstorage";


const apiPrivate = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-type": "application/json",
  },
});

const setUpInterceptors = (store) => {
  apiPrivate.interceptors.request.use(async (req) => {
    console.log("Inside interceptor AXIOS");
    const user = store?.getState()?.auth?.user;
    const authStorage = getLocalStorageItem("user");
    let currentDate = new Date();
    console.log("State auth inteceptor ",user)
    console.log("Storage auth inteceptor ",authStorage)
    if (user && user?.payload.accessToken) {
      console.log(
        "AVANT REHRESH : user.payload.accessToken",
        user.payload.accessToken
      );
      let accessToken = user.payload.accessToken;
      req.headers.Authorization = `Bearer ${accessToken}`;
      const email = user.payload.user.email;
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
      if(store?.getState().auth.user == null){
        let user = getLocalStorageItem("user")
      console.log('userStorage',user)
      return req
      }
      // console.log("store?.getState().auth.user",store?.getState().auth.user)

      let newAccessToken = store?.getState()?.auth?.user.payload.accessToken;
      console.log("APRES REHRESH : user.payload.accessToken", newAccessToken);
      req.headers.Authorization = `Bearer ${newAccessToken}`;
      req.withCredentials = true;
      console.log("req", req);
      return req;
    }


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
