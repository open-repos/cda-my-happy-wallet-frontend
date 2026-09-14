import React from "react";
import { useState } from "react";

import "../../css/ThemeSelector.css";
import { applyThemePreference, readThemePreference } from "../design/theme";

const ThemeSelector = () => {
  const [preference, setPreference] = useState(readThemePreference);

  const selectTheme = (event) => {
    const nextPreference = event.target.value;
    applyThemePreference(nextPreference);
    setPreference(nextPreference);
  };

  return (
    <section className="theme-selector" aria-labelledby="theme-selector-title">
      <div>
        <h2 id="theme-selector-title">Apparence</h2>
        <p>Utilisez le thème de l’appareil ou choisissez une préférence.</p>
      </div>
      <label htmlFor="theme-preference">Thème</label>
      <select id="theme-preference" onChange={selectTheme} value={preference}>
        <option value="system">Système</option>
        <option value="light">Clair</option>
        <option value="dark">Sombre</option>
      </select>
    </section>
  );
};

export default ThemeSelector;
