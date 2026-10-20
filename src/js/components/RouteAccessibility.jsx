import React, { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

const titles = {
  "/": "Tableau de bord",
  "/home": "Tableau de bord",
  "/home/operations-fixes": "Charges et revenus fixes",
  "/login": "Connexion",
  "/register": "Inscription",
  "/forgot-password": "Mot de passe oublié",
  "/new-password": "Nouveau mot de passe",
  "/operations": "Opérations",
  "/calendrier": "Calendrier",
  "/prochains-mois": "Prochains mois",
  "/objectifs-evenements": "Objectifs et événements",
  "/categories": "Catégories",
  "/analyses": "Analyses",
  "/profil": "Profil",
};

export const RouteAccessibility = () => {
  const { pathname } = useLocation();
  const previousPath = useRef(pathname);
  useEffect(() => {
    const path = pathname.replace(/\/+$/, "") || "/";
    document.title = `${titles[path] || "Page introuvable"} | My Happy Wallet`;
    if (previousPath.current !== pathname) {
      document.getElementById("main-content")?.focus();
    }
    previousPath.current = pathname;
  }, [pathname]);

  return (
    <a
      className="skip-link"
      href="#main-content"
      onClick={(event) => {
        const content = document.getElementById("main-content");
        if (content) {
          // Keep focus transfer independent of router hash transitions/remounts.
          event.preventDefault();
          content.focus();
        }
      }}
    >
      Aller au contenu principal
    </a>
  );
};
