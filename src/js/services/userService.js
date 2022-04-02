import api from "../../utils/api";
import { getLocalStorageItem, setLocalStorageItem, removeLocalStorageItem } from "../../utils/localstorage";

function authHeader() {
  const user = getLocalStorageItem("user");
  if (user && user.accessToken) {
    return { Authorization: 'Bearer ' + user.accessToken };
  } else {
    return {};
  }
}


class UserService {
  getAll() {
    return api.get("/users");
  }
//   get(id) {
//     return api.get(`/users/${id}`);
//   }
  async register(data) {
    // try {
      const response =await  api.post("/users/register/", data);

    } 
    async logout() {
          removeLocalStorageItem("user")
    }

  async login(data) {
    const response =await  api.post(`/users/authenticate/`, data, {withCredentials: true });
    if (response.data){
        setLocalStorageItem(response.data,"user")
    }
    console.log("inside axios'",response)
    return response.data
  }
  async delete(data) {
    return api.delete(`/users/delete`,data,{ headers: authHeader()});
  }
  async verifyAccount(id,token) {
    return api.get(`/users/verify/${id}/${token}`);
  }
  async resetPasswordPost(data) {
    return api.post(`/users/reset-password`,data);
  }

  async resetPasswordGet(token) {
    return api.get(`/users/reset-password/${token}`, {withCredentials: true });
  }
  async newPassword(data) {
    return api.post(`/users/new-password/`,data,{ headers: authHeader()});
  }
  async renewAccessToken(data){
      return api.post(`/token`,data,{ headers: authHeader(),  withCredentials: true })
  }
}
export default new UserService();