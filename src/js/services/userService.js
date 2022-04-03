import api from "../../utils/api";
import { apiPrivate } from "../../utils/axiosHelper";
import {
  setLocalStorageItem,
  removeLocalStorageItem,
} from "../../utils/localstorage";

class UserService {

  async register(data) {
    await api.post("/users/register/", data);
  }
  async logout() {
   removeLocalStorageItem("user");
  }

  async login(data) {
    const response = await api.post(`/users/authenticate/`, data, {
      withCredentials: true,
    });
    console.log("response inside login", response);
    if (response.data) {
      await setLocalStorageItem(response.data, "user");
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
