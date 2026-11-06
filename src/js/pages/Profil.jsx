import React from "react";
import { PageHeader } from "../components/PageHeader";
import "../../css/Profil.css";

function Profil() {
  return (
    <main className="profil-container">
      <PageHeader eyebrow="Préférences" title="Profil">
        Le thème clair ou sombre se change depuis la barre de menu.
      </PageHeader>
    </main>
  );
}

export default Profil;
