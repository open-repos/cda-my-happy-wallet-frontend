import tokenContract from "../../../design-tokens/tokens.json";

export const THEME_PREFERENCES = [
  tokenContract.meta.defaultTheme,
  ...Object.keys(tokenContract.themes),
];
export const THEME_STORAGE_KEY = tokenContract.meta.themeStorageKey;

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

  return preference;
};

export const initializeTheme = () => {
  const preference = readThemePreference();
  return applyThemePreference(preference);
};
