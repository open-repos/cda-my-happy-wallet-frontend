import tokenContract from "../../../design-tokens/tokens.json";

export const THEME_PREFERENCES = [
  tokenContract.meta.defaultTheme,
  ...Object.keys(tokenContract.themes),
];
export const THEME_STORAGE_KEY = tokenContract.meta.themeStorageKey;
export const THEME_CHANGE_EVENT = "mhw-theme-change";
export const DARK_SCHEME_QUERY = "(prefers-color-scheme: dark)";

const isThemePreference = (value) => THEME_PREFERENCES.includes(value);

export const readThemePreference = (storage = window.localStorage) => {
  try {
    const storedPreference = storage.getItem(THEME_STORAGE_KEY);
    return isThemePreference(storedPreference) ? storedPreference : "system";
  } catch {
    return "system";
  }
};

export const applyThemePreference = (
  preference,
  root = document.documentElement,
  storage = window.localStorage
) => {
  if (!isThemePreference(preference)) {
    throw new TypeError(`Unsupported theme preference: ${preference}`);
  }

  if (preference === "system") {
    root.removeAttribute("data-theme");
  } else {
    root.setAttribute("data-theme", preference);
  }

  try {
    storage.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    // The visual preference still applies when storage is unavailable.
  }

  // Every theme toggle (navigation, mobile header) follows it.
  window.dispatchEvent(
    new CustomEvent(THEME_CHANGE_EVENT, { detail: preference })
  );
  return preference;
};

/** Theme actually displayed: "system" follows the device setting. */
export const resolveTheme = (preference, matchMedia = window.matchMedia) => {
  if (preference !== "system") return preference;
  return matchMedia?.(DARK_SCHEME_QUERY).matches ? "dark" : "light";
};

export const initializeTheme = () => {
  const preference = readThemePreference();
  return applyThemePreference(preference);
};
