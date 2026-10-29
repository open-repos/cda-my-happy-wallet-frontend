import { apiPrivate } from "../../utils/axiosHelper";
const parseCollectionPage = (payload, parse) => {
  if (
    !Array.isArray(payload?.data) ||
    typeof payload?.meta?.hasNext !== "boolean" ||
    (payload.meta.hasNext && !payload.meta.nextCursor)
  )
    throw new Error("Invalid resolution page");
  return { data: payload.data.map(parse), meta: payload.meta };
};

export const parseResolution = (item) => {
  if (
    !Number.isInteger(item?.eventId) ||
    item.eventId <= 0 ||
    !/^\d{4}-\d{2}-\d{2}$/.test(item?.occurrenceDate ?? "") ||
    !["REALIZED", "CANCELED"].includes(item?.status) ||
    typeof item.title !== "string" ||
    !/^\d+\.\d{2}$/.test(item.amount ?? "") ||
    !/^[A-Z]{3}$/.test(item.currency ?? "") ||
    !["DEPENSE", "ENTREE"].includes(item.kind) ||
    !Number.isFinite(Date.parse(item.resolvedAt)) ||
    !(
      item.operation === null ||
      (Number.isInteger(item.operation?.id) &&
        typeof item.operation.title === "string" &&
        /^\d+\.\d{2}$/.test(item.operation.amount ?? "") &&
        /^\d{4}-\d{2}-\d{2}$/.test(item.operation.operationDate ?? "") &&
        Number.isInteger(item.operation.categoryId))
    )
  )
    throw new Error("Invalid occurrence resolution response");
  return item;
};
export const listCalendarResolutions = async (from, to) => {
  const items = [],
    seen = new Set();
  let cursor = null;
  do {
    const response = await apiPrivate.get("/event-occurrence-resolutions", {
      params: { from, to, limit: 100, ...(cursor ? { cursor } : {}) },
      withCredentials: true,
    });
    const page = parseCollectionPage(response.data, parseResolution);
    items.push(...page.data);
    cursor = page.meta.hasNext ? page.meta.nextCursor : null;
    if (cursor && seen.has(cursor))
      throw new Error("Repeated resolution cursor");
    if (cursor) seen.add(cursor);
  } while (cursor);
  return items;
};
