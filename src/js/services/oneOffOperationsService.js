import { apiPrivate } from "../../utils/axiosHelper";

export const OPERATIONS_PAGE_LIMIT = 20;
const CATEGORIES_PAGE_LIMIT = 100;

const isPaginationMeta = (meta) =>
  Number.isInteger(meta?.limit) &&
  typeof meta?.hasNext === "boolean" &&
  (typeof meta?.nextCursor === "string" || meta?.nextCursor === null);

const parseCollectionPage = (payload, parseItem) => {
  if (!Array.isArray(payload?.data) || !isPaginationMeta(payload?.meta)) {
    throw new Error("Invalid collection response");
  }

  return {
    data: payload.data.map(parseItem),
    meta: payload.meta,
  };
};

export const parseOperation = (operation) => {
  if (
    !Number.isInteger(operation?.id) ||
    operation.id <= 0 ||
    typeof operation?.title !== "string" ||
    operation.title.length < 2 ||
    operation.title.length > 50 ||
    typeof operation?.amount !== "string" ||
    !/^(0|[1-9]\d{0,7})(?:\.\d{2})$/.test(operation.amount) ||
    typeof operation?.currency !== "string" ||
    !/^[A-Z]{3}$/.test(operation.currency) ||
    !["DEPENSE", "ENTREE"].includes(operation?.type) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(operation?.operationDate) ||
    !Number.isInteger(operation?.categoryId) ||
    operation.categoryId <= 0
  ) {
    throw new Error("Invalid operation response");
  }
  return {
    id: operation.id,
    title: operation.title,
    amount: operation.amount,
    currency: operation.currency,
    type: operation.type,
    operationDate: operation.operationDate,
    categoryId: operation.categoryId,
  };
};

export const parseCategory = (category) => {
  if (
    !Number.isInteger(category?.id) ||
    category.id <= 0 ||
    typeof category?.name !== "string" ||
    category.name.length < 2 ||
    category.name.length > 50 ||
    (category?.color !== null && !/^#[0-9A-F]{6}$/i.test(category?.color))
  ) {
    throw new Error("Invalid category response");
  }
  return {
    id: category.id,
    name: category.name,
    color: category.color,
  };
};

export const oneOffOperationsService = {
  async listOperations(cursor = null) {
    const response = await apiPrivate.get("/operations", {
      params: {
        limit: OPERATIONS_PAGE_LIMIT,
        ...(cursor ? { cursor } : {}),
      },
      withCredentials: true,
    });
    return parseCollectionPage(response.data, parseOperation);
  },

  async listAllCategories() {
    const categories = [];
    const visitedCursors = new Set();
    let cursor = null;

    do {
      const response = await apiPrivate.get("/operation-categories", {
        params: {
          limit: CATEGORIES_PAGE_LIMIT,
          ...(cursor ? { cursor } : {}),
        },
        withCredentials: true,
      });
      const page = parseCollectionPage(response.data, parseCategory);
      categories.push(...page.data);
      cursor = page.meta.hasNext ? page.meta.nextCursor : null;
      if (cursor && visitedCursors.has(cursor)) {
        throw new Error("Repeated category cursor");
      }
      if (cursor) visitedCursors.add(cursor);
    } while (cursor);

    return categories;
  },

  async createOperation(operation) {
    const response = await apiPrivate.post("/operations", operation, {
      withCredentials: true,
    });
    return parseOperation(response.data?.data);
  },

  async updateOperation(id, operation) {
    const response = await apiPrivate.put(`/operations/${id}`, operation, {
      withCredentials: true,
    });
    return parseOperation(response.data?.data);
  },

  async deleteOperation(id) {
    await apiPrivate.delete(`/operations/${id}`, { withCredentials: true });
  },
};
