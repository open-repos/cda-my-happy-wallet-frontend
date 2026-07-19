import assert from "assert";
import toolkit from "@reduxjs/toolkit";
import { createServer } from "vite";

const { configureStore } = toolkit;
const storage = new Map();

globalThis.window = {
  localStorage: {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
    removeItem: (key) => storage.delete(key),
  },
};

const vite = await createServer({
  configFile: false,
  logLevel: "silent",
  server: { middlewareMode: true },
});

try {
  const serviceModule = await vite.ssrLoadModule(
    "/src/js/services/operationsFixesService.js"
  );
  const sliceModule = await vite.ssrLoadModule(
    "/src/js/slices/operationsFixes/operationsFixesSlice.js"
  );

  serviceModule.default.getAllRevenus = async () => {
    throw {
      response: {
        status: 503,
        data: { error: { message: "Revenue service unavailable" } },
      },
    };
  };

  const store = configureStore({ reducer: sliceModule.default });
  const action = await store.dispatch(sliceModule.revenusApi());

  assert.strictEqual(action.type, "operationsFixes/revenus/rejected");
  assert.strictEqual(action.payload, "Revenue service unavailable");
  assert.strictEqual(store.getState().revenus.isError, true);
  assert.strictEqual(
    store.getState().revenus.message,
    "Revenue service unavailable"
  );
} finally {
  await vite.close();
}
