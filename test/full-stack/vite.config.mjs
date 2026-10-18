import { mergeConfig } from "vite";
import baseConfig from "../../vite.config.js";

export default mergeConfig(baseConfig, {
  // Only this test build uses the isolated same-origin API proxy.
  define: { "import.meta.env.VITE_API_BASE_URL": JSON.stringify("/v1/") },
  build: { outDir: "dist-e2e" },
  plugins: [
    {
      name: "isolated-http-cache-positive-control",
      configurePreviewServer(server) {
        // Public positive control only. API responses always reach the real proxy.
        server.middlewares.use("/__proof/http-cache", (_request, response) => {
          response.setHeader("content-type", "text/plain");
          response.setHeader("cache-control", "public, max-age=3600");
          response.end("synthetic public cache positive control");
        });
      },
    },
  ],
  preview: {
    host: "127.0.0.1",
    port: 4175,
    strictPort: true,
    proxy: { "/v1": { target: "http://api:4201", changeOrigin: true } },
  },
});
