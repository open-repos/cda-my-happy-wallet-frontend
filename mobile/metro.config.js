const path = require("node:path");
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

config.resolver.resolveRequest = (context, moduleName, platform) => {
  // ECharts/zrender pin tslib 2.3.0. Its `import` entry wraps a default import
  // from UMD, which Metro cannot interoperate with (__extends is undefined).
  // Resolve the ESM helper file from the SAME installed package instead.
  if (
    moduleName === "tslib" &&
    /[/\\]node_modules[/\\](echarts|zrender)[/\\]/.test(
      context.originModulePath,
    )
  ) {
    const entry = require.resolve("tslib", {
      paths: [path.dirname(context.originModulePath)],
    });
    return {
      type: "sourceFile",
      filePath: path.join(path.dirname(entry), "tslib.es6.js"),
    };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
