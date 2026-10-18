// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*"],
  },
  {
    // Le `SafeAreaView` de React Native n'agit que sur iOS : la barre d'état
    // Android recouvrait l'écran (#147).
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "react-native",
              importNames: ["SafeAreaView"],
              message:
                "Utiliser SafeAreaView de react-native-safe-area-context (TAB_SCREEN_EDGES pour un écran à onglets).",
            },
          ],
        },
      ],
    },
  },
]);
