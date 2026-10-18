import { resolve } from "node:path";
import { buildPwaWorker } from "../../scripts/build-pwa-worker.mjs";

if (process.env.MHW_E2E !== "1")
  throw new Error("Build the isolated worker through npm run test:e2e:stack.");
await buildPwaWorker({ outDir: resolve("dist-e2e") });
console.log("The isolated Web worker is ready.");
