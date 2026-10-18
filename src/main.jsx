import React from "react";
import { createRoot } from "react-dom/client";
import "./css/App.css";
import App from "./js/App";
import { BrowserRouter } from "react-router-dom";
import store from "./js/store/store";
import { Provider } from "react-redux";
import "./assets/icons/fontawesome";
import { setUpInterceptors } from "./utils/axiosHelper.js";
import { initializeTheme } from "./js/design/theme.js";

setUpInterceptors(store);
initializeTheme();

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </Provider>
  </React.StrictMode>
);
