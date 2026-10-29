import { parseAcknowledgedWrite } from "../utils/acknowledgedWrite";
import { apiPrivate } from "../../utils/axiosHelper";
import {
  oneOffOperationsService,
  parseCategory,
} from "./oneOffOperationsService";

const assertId = (id) => {
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error("Invalid category id");
  }
};

/**
 * Corps envoyé à l'API. Un `icon` absent n'est pas transmis : le backend
 * conserve alors l'icône existante; `null` revient à la pastille.
 */
const body = ({ name, color, icon }) =>
  icon === undefined ? { name, color } : { name, color, icon };

/** Commandes des catégories d'opérations de la personne connectée. */
export const categoryService = {
  listAll: () => oneOffOperationsService.listAllCategories(),

  async create(category) {
    const response = await apiPrivate.post(
      "/operation-categories",
      body(category),
      { withCredentials: true }
    );
    return parseAcknowledgedWrite(parseCategory, response.data?.data);
  },

  async update(id, category) {
    assertId(id);
    const response = await apiPrivate.put(
      `/operation-categories/${id}`,
      body(category),
      { withCredentials: true }
    );
    return parseAcknowledgedWrite(parseCategory, response.data?.data);
  },

  async remove(id) {
    assertId(id);
    await apiPrivate.delete(`/operation-categories/${id}`, {
      withCredentials: true,
    });
  },
};

/** Code d'erreur stable de l'API, ou `null` pour une panne réseau. */
export const categoryErrorCode = (error) => {
  const code = error?.response?.data?.error?.details?.code;
  if (typeof code === "string") return code;
  return error?.response?.status === 404 ? "CATEGORY_NOT_FOUND" : null;
};
