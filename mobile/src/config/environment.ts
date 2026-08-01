const DEFAULT_API_ORIGIN = "https://api.myhappywallet.andriacapai.com";

const removeTrailingSlash = (value: string) => value.replace(/\/+$/, "");

export const environment = {
  apiOrigin: removeTrailingSlash(
    process.env.EXPO_PUBLIC_API_ORIGIN ?? DEFAULT_API_ORIGIN,
  ),
};
