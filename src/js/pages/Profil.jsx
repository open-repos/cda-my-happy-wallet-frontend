import React from "react";
import { PageHeader } from "../components/PageHeader";
import "../../css/Profil.css";
import ThemeSelector from "../components/ThemeSelector";

function Profil() {
  return (
    <main className="profil-container">
      <PageHeader eyebrow="Préférences" title="Profil">
        Personnalisez votre espace MyHappyWallet.
      </PageHeader>
      <ThemeSelector />
    </main>
  );
}

export default Profil;
