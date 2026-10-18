// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*"],
  },
  {
    rules: {
      // `accessibilityState.checked` n'est pas exposé par react-native-web :
      // l'état coché d'un radio passe par `aria-checked` (#148).
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "JSXAttribute[name.name='accessibilityState'] Property[key.name='checked'], JSXAttribute[name.name='accessibilityState'] Property[key.value='checked']",
          message: "Utiliser aria-checked pour l'état coché d'un radio.",
        },
      ],
      // Le `SafeAreaView` de React Native n'agit que sur iOS : la barre d'état
      // Android recouvrait l'écran (#147).
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
