import {apiPrivate} from "../../utils/axiosHelper";

class OperationsFixesService {
  async getAllRevenus() {
    return await apiPrivate.get("/operations-fixes/revenus", {withCredentials: true });
  }

  async getAllCharges() {
    return  await apiPrivate.get("/operations-fixes/charges", {withCredentials: true });
  }

  async postCharges(data) {
    return  await apiPrivate.post("/operations-fixes/charges",data, {withCredentials: true });
  }

  async postRevenus(data) {
    return  await apiPrivate.post("/operations-fixes/revenus",data, {withCredentials: true });
  }
  
  // async calculRaV(charges,revenus) {
  //   return  await "ok"
  // }
  

}
export default new OperationsFixesService();