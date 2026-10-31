import api from "../../utils/api";
import { apiPrivate } from "../../utils/axiosHelper";
import {
  setLocalStorageItem,
  removeLocalStorageItem,
} from "../../utils/localstorage";
import { toApiPayload } from "./apiResponse.mjs";

const LOGOUT_TIMEOUT_MS = 5000;

class UserService {
  constructor() {
    this.pendingLogout = Promise.resolve();
  }

  async register(data) {
    return await api.post("/users/register/", data);
  }
  async logout() {
    removeLocalStorageItem("user");
    // The local sign-out stays immediate, even when the server cannot be reached.
    this.pendingLogout = api
      .post("/users/logout", {}, {
        timeout: LOGOUT_TIMEOUT_MS,
        withCredentials: true,
      })
      .catch(() => undefined);
  }

  async login(data) {
    // A late logout response must not clear the cookies of the next session.
    await this.pendingLogout;
    const response = await api.post(`/users/authenticate/`, data, {
      withCredentials: true,
    });
    const payload = toApiPayload(response);
    if (payload) {
      await setLocalStorageItem(payload, "user");
    }
    return payload;
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
