import { apiPrivate } from "../../utils/axiosHelper";

class OperationsFixesService {
  async getAllRevenus() {
    return this.getCollection("revenus");
  }

  async getAllCharges() {
    return this.getCollection("charges");
  }

  async getCollection(type) {
    const rows = [];
    const cursors = new Set();
    let cursor = null;
    let response;
    do {
      response = await apiPrivate.get(`/operations-fixes/${type}`, {
        withCredentials: true,
        params: { limit: 100, ...(cursor ? { cursor } : {}) },
      });
      if (!Array.isArray(response.data?.data))
        throw new Error("Invalid charges response");
      rows.push(...response.data.data);
      const meta = response.data.meta;
      if (
        meta &&
        (typeof meta.hasNext !== "boolean" ||
          (meta.hasNext &&
            (typeof meta.nextCursor !== "string" || !meta.nextCursor)))
      )
        throw new Error("Invalid charges pagination");
      cursor = meta?.hasNext ? meta.nextCursor : null;
      if (cursor && cursors.has(cursor))
        throw new Error("Repeated charges cursor");
      if (cursor) cursors.add(cursor);
    } while (cursor);
    return { ...response, data: { ...response.data, data: rows } };
  }

  async putCharge(id, data) {
    return await apiPrivate.put(`/operations-fixes/charges/${id}`, data, {
      withCredentials: true,
    });
  }

  async deleteCharge(id) {
    return await apiPrivate.delete(`/operations-fixes/charges/${id}`, {
      withCredentials: true,
    });
  }

  async putRevenu(id, data) {
    return apiPrivate.put(`/operations-fixes/revenus/${id}`, data, {
      withCredentials: true,
    });
  }

  async deleteRevenu(id) {
    return apiPrivate.delete(`/operations-fixes/revenus/${id}`, {
      withCredentials: true,
    });
  }

  async postCharges(data) {
    return await apiPrivate.post("/operations-fixes/charges", data, {
      withCredentials: true,
    });
  }

  async postRevenus(data) {
    return await apiPrivate.post("/operations-fixes/revenus", data, {
      withCredentials: true,
    });
  }

  // async calculRaV(charges,revenus) {
  //   return  await "ok"
  // }
}
export default new OperationsFixesService();
