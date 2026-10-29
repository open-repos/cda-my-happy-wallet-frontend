import React from "react";
import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <main className="atelier-not-found" id="main-content" tabIndex={-1}>
      <h1>Page introuvable</h1>
      <p>Cette page n’existe pas.</p>
      <Link to="/home">Revenir à l’accueil</Link>
    </main>
  );
}
