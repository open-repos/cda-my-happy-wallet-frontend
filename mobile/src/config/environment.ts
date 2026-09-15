const DEFAULT_API_ORIGIN = "https://api.myhappywallet.andriacapai.com";

const normalizeApiOrigin = (rawValue: string | undefined): string => {
  const value = rawValue?.trim() || DEFAULT_API_ORIGIN;
  const url = new URL(value);

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("EXPO_PUBLIC_API_ORIGIN must use HTTP or HTTPS.");
  }

  if (
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  ) {
    throw new Error(
      "EXPO_PUBLIC_API_ORIGIN must be an origin without credentials, path, query or fragment.",
    );
  }

  return url.origin;
};

export const createEnvironment = (apiOriginValue?: string) => {
  const apiOrigin = normalizeApiOrigin(apiOriginValue);

  return {
    apiOrigin,
    apiBaseUrl: `${apiOrigin}/v1`,
  };
};

export const environment = createEnvironment(
  process.env.EXPO_PUBLIC_API_ORIGIN,
);
