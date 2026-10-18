// Synthetic test entry: compiled separately, never included in the application dist.
import React from "react";
import { createRoot } from "react-dom/client";
import { PwaUpdates } from "../../src/js/pwa/PwaUpdates.jsx";
import "../../src/css/design-tokens.css";

createRoot(document.getElementById("updates")).render(<PwaUpdates enabled />);
