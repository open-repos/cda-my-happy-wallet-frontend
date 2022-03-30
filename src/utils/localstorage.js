export const setLocalStorageItem = async (value, item) => {
  return await window.localStorage.setItem(
    JSON.stringify(item),
    JSON.stringify(value)
  );
};

export const getLocalStorageItem = (key) => {
  return JSON.parse(window.localStorage.getItem(JSON.stringify(key)));
};

export const removeLocalStorageItem = (key) => {
  return window.localStorage.removeItem(JSON.stringify(key));
};
