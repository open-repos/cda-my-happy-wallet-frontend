import { mergeConfig } from "vite";
import baseConfig from "../../vite.config.js";

export default mergeConfig(baseConfig, {
  define: { "import.meta.env.VITE_API_BASE_URL": JSON.stringify("/v1/") },
  build: { outDir: "dist-visual" },
  preview: { host: "127.0.0.1", port: 4173, strictPort: true },
});
