import {apiPrivate} from "../../utils/api";

class OperationsFixesService {
  async getAllRevenus() {
    return await apiPrivate.get("/operations-fixes/revenus", {withCredentials: true });
  }

  async getAllCharges() {
    return  await apiPrivate.get("/operations-fixes/charges", {withCredentials: true });
  }

}
export default new OperationsFixesService();