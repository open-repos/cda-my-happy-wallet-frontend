import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import "../../../src/css/design-tokens.css";
import { FilterCombobox } from "../../../src/js/components/Fields/FilterCombobox";
import { createArrayOptionSource } from "../../../src/js/utils/filterOptions";

// #360 test bench: a simulated paginated source until backend #165 exists.
// Query parameters: theme=dark, delay=<ms>, failCursor=<cursor> (one failure).
const params = new URLSearchParams(window.location.search);
document.documentElement.dataset.theme = params.get("theme") || "light";
const delay = Number(params.get("delay") || 120);
let failCursor = params.get("failCursor");

const LABELS = Array.from(
  { length: 47 },
  (_, i) => `Opération ${String(i + 1).padStart(2, "0")}`
);
LABELS[2] = "Électricité et gaz de la résidence principale";
const local = createArrayOptionSource(
  LABELS.map((label, i) => ({ value: `v${i + 1}`, label }))
);
window.__filterRequests = [];
const loadOptions = (request) => {
  window.__filterRequests.push({
    query: request.query,
    cursor: request.cursor,
  });
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      if (failCursor && request.cursor === failCursor) {
        failCursor = null;
        reject(new Error("Erreur simulée"));
      } else local(request).then(resolve, reject);
    }, delay);
    request.signal.addEventListener("abort", () => {
      clearTimeout(timer);
      reject(new DOMException("Requête annulée", "AbortError"));
    });
  });
};

const Bench = () => {
  const [single, setSingle] = useState(null);
  const [many, setMany] = useState([]);
  return (
    <main
      style={{
        boxSizing: "border-box",
        minHeight: "100vh",
        padding: 16,
        background: "var(--ds-color-background-canvas)",
        color: "var(--ds-color-text-primary)",
        font: "16px/1.45 system-ui, sans-serif",
      }}
    >
      <h1 style={{ fontSize: "1.25rem" }}>FilterCombobox</h1>
      <section data-testid="single">
        <FilterCombobox
          label="Filtrer par titre"
          value={single}
          onChange={setSingle}
          loadOptions={loadOptions}
        />
        <p data-testid="single-value">{single?.label ?? "aucune"}</p>
      </section>
      <section data-testid="multiple">
        <FilterCombobox
          label="Filtrer par catégorie"
          multiple
          value={many}
          onChange={setMany}
          loadOptions={loadOptions}
        />
        <p data-testid="multiple-value">
          {many.map((option) => option.label).join(" | ") || "aucune"}
        </p>
      </section>
      <table style={{ tableLayout: "fixed", width: "100%" }}>
        <thead>
          <tr>
            <th style={{ width: "40%", textAlign: "left" }}>
              Titre
              <FilterCombobox
                label="Filtrer la colonne Titre"
                hideLabel
                placeholder="Filtrer…"
                value={null}
                onChange={() => {}}
                loadOptions={loadOptions}
              />
            </th>
            <th style={{ textAlign: "left" }}>Montant</th>
          </tr>
        </thead>
      </table>
    </main>
  );
};

createRoot(document.getElementById("root")).render(<Bench />);
