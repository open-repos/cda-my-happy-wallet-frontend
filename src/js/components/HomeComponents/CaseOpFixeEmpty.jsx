import React from "react";
import { useNavigate } from "react-router-dom";
import { ActionButton } from "../Actions/ActionButton";

const CaseOpFixeEmpty = () => {
  const navigate = useNavigate();
  return (
    <section className="atelier-empty-budget" aria-label="Démarrer mon budget">
      <h2>Commencez par renseigner votre budget</h2>
      <p>
        Ajoutez vos charges et vos entrées fixes pour retrouver votre reste à
        vivre et préparer les mois suivants.
      </p>
      <ActionButton
        action="add"
        type="button"
        onClick={() => navigate("/home/operations-fixes")}
      >
        Ajouter mes éléments fixes
      </ActionButton>
    </section>
  );
};
export default CaseOpFixeEmpty;
