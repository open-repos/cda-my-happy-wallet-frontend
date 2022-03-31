import api from "../utils/api";
class UserService {
  getAll() {
    return api.get("/users");
  }
//   get(id) {
//     return api.get(`/users/${id}`);
//   }
  register(data) {
    return api.post("/users/register/", data);
  }
  login(data) {
    return api.post(`/users/authenticate/`, data);
  }
  delete(data) {
    return api.delete(`/users/delete`,data);
  }
  verifyAccount(id,token) {
    return api.get(`/users/verify/${id}/${token}`);
  }
  resetPassword(token) {
    return api.get(`/users/reset-password/${token}`);
  }
  newPassword(data) {
    return api.post(`/users/new-password/`,data);
  }
  renewAccessToken(data){
      return api.post(`/token`,data)
  }
}
export default new UserService();