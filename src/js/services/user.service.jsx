import api from "../utils/api";
import { setLocalStorageItem } from "../utils/localstorage";
class UserService {
  getAll() {
    return api.get("/users");
  }
//   get(id) {
//     return api.get(`/users/${id}`);
//   }
  async register(data) {
     const response =await  api.post("/users/register/", data);
     console.log(response)
     if (response.data){
        //  setLocalStorageItem(response.data,"message")
        console.log(data)
     }
     return response.data
    } 
  
  async login(data) {
    const response =await  api.post(`/users/authenticate/`, data);
    if (response.data){
        setLocalStorageItem(response.data,"user")
    }
    return response.data
  }
  async delete(data) {
    return api.delete(`/users/delete`,data);
  }
  async verifyAccount(id,token) {
    return api.get(`/users/verify/${id}/${token}`);
  }
  async resetPassword(token) {
    return api.get(`/users/reset-password/${token}`);
  }
  async newPassword(data) {
    return api.post(`/users/new-password/`,data);
  }
  async renewAccessToken(data){
      return api.post(`/token`,data)
  }
}
export default new UserService();