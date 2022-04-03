import api, { apiPrivate } from "../../utils/api";
import {
  setLocalStorageItem,
  removeLocalStorageItem,
} from "../../utils/localstorage";

// function authHeader() {
//   const auth = getLocalStorageItem("auth");
//   console.log("user inside authHeader",auth)
//   if (auth && auth?.payload.accessToken) {
//     return { Authorization: 'Bearer ' + auth?.payload.accessToken };
//   } else {
//     return {};
//   }
// }

class UserService {
  // getAll() {
  //   return api.get("/users");
  // }
  //   get(id) {
  //     return api.get(`/users/${id}`);
  //   }
  async register(data) {
    // try {
    const response = await api.post("/users/register/", data);
  }
  async logout() {
   removeLocalStorageItem("auth");
  }

  async login(data) {
    const response = await api.post(`/users/authenticate/`, data, {
      withCredentials: true,
    });
    console.log("response inside login", response);
    if (response.data) {
      await setLocalStorageItem(response.data, "auth");
    }
    console.log("inside axios'", response);
    return response.data;
  }
  async delete(data) {
    return await apiPrivate.delete(`/users/delete`, data);
  }
  async verifyAccount(id, token) {
    return await api.get(`/users/verify/${id}/${token}`);
  }
  async resetPasswordPost(data) {
    return await api.post(`/users/reset-password`, data);
  }

  async resetPasswordGet(token) {
    return await api.get(`/users/reset-password/${token}`, {
      withCredentials: true,
    });
  }
  async newPassword(data) {
    return await apiPrivate.post(`/users/new-password/`, data);
  }
  async renewAccessToken(data, token) {
    return await api.post(`/token`, data, {
      headers: { Authorization: "Bearer " + token },
      withCredentials: true,
    });
  }
}
export default new UserService();
