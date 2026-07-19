import axios from "axios";
import { API_BASE_URL } from "./constants";
import jwt_decode from "jwt-decode";

import { newRefreshToken } from "../js/slices/auth/authSlice";
import { getLocalStorageItem } from "./localstorage";
import { createRefreshTokenHandler } from "../js/services/refreshTokenHandler.mjs";


const apiPrivate = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-type": "application/json",
  },
});

const setUpInterceptors = (store) => {
  const handleRefreshToken = createRefreshTokenHandler({
    store,
    decodeToken: jwt_decode,
    createRefreshAction: newRefreshToken,
    getStoredUser: getLocalStorageItem,
  });

  apiPrivate.interceptors.request.use(handleRefreshToken, (error) => {
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
