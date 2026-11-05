/** Helpers shared by filter fields (#360): accent-insensitive matching and a
 * local paginated source following the API envelope `{data, meta}`. */

export const foldText = (text) =>
  String(text ?? "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLocaleLowerCase("fr");

/** Returns `[before, match, after]` in the original label, or `null`. */
export const highlightMatch = (label, query) => {
  const needle = foldText(query);
  if (!needle) return null;
  const chars = [...String(label)];
  let folded = "";
  const origin = [];
  chars.forEach((char, index) => {
    const part = foldText(char);
    folded += part;
    for (let i = 0; i < part.length; i += 1) origin.push(index);
  });
  const start = folded.indexOf(needle);
  if (start < 0) return null;
  const from = origin[start];
  const to = origin[start + needle.length - 1] + 1;
  return [
    chars.slice(0, from).join(""),
    chars.slice(from, to).join(""),
    chars.slice(to).join(""),
  ];
};

const abortError = () => new DOMException("Requête annulée", "AbortError");

/** Paginated `loadOptions` over a local array, for tests and short lists.
 * The cursor is opaque to callers, like the backend's. */
export const createArrayOptionSource =
  (options) =>
  ({ query = "", cursor = null, limit = 10, signal } = {}) => {
    if (signal?.aborted) return Promise.reject(abortError());
    const needle = foldText(query);
    const matches = options.filter((option) =>
      foldText(option.label).includes(needle)
    );
    const start = cursor ? Number(cursor) : 0;
    const data = matches.slice(start, start + limit);
    const hasNext = start + limit < matches.length;
    return Promise.resolve({
      data,
      meta: {
        limit,
        hasNext,
        nextCursor: hasNext ? String(start + limit) : null,
      },
    });
  };
