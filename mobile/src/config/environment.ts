const DEFAULT_API_ORIGIN = "https://api.myhappywallet.andriacapai.com";

const removeTrailingSlash = (value: string) => value.replace(/\/+$/, "");

const apiOrigin = removeTrailingSlash(
  process.env.EXPO_PUBLIC_API_ORIGIN ?? DEFAULT_API_ORIGIN,
);

export const environment = {
  apiOrigin,
  apiBaseUrl: `${apiOrigin}/v1`,
};
