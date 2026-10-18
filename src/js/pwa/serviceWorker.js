import { attachPublicWorker } from "./publicWorker.js";

// Replaced at build time; no environment, credential or user state is embedded.
attachPublicWorker(self, __MHW_PWA_CONFIG__);
