import { mergeConfig } from "vite";
import baseConfig from "../../vite.config.js";

export default mergeConfig(baseConfig, {
  // Only this test build uses the isolated same-origin API proxy.
  define: { "import.meta.env.VITE_API_BASE_URL": JSON.stringify("/v1/") },
  build: { outDir: "dist-e2e" },
  preview: {
    host: "127.0.0.1",
    port: 4175,
    strictPort: true,
    proxy: { "/v1": { target: "http://api:4201", changeOrigin: true } },
  },
});
