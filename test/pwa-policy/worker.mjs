// Local lifecycle proof for the same runtime shipped in dist/sw.js.
import { attachPublicWorker } from "/public-worker.js";
const build = "__BUILD__";
const previous = "__PREVIOUS__" || null;
attachPublicWorker(self, {
  build,
  previous,
  assets: [`/assets/proof-${build}.js`, "/offline.html"],
});
