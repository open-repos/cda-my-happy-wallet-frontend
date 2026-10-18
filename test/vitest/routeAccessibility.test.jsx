import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Link, MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, expect, it } from "vitest";
import { RouteAccessibility } from "../../src/js/components/RouteAccessibility";

const originalTitle = document.title;
afterEach(() => {
  cleanup();
  document.title = originalTitle;
});

const renderRoute = (entry = "/login") =>
  render(
    <MemoryRouter initialEntries={[entry]}>
      <RouteAccessibility />
      <Routes>
        <Route
          path="/login"
          element={
            <main id="main-content" tabIndex={-1}>
              <h1>Connexion</h1>
              <Link to="/home">Accueil</Link>
            </main>
          }
        />
        <Route
          path="*"
          element={
            <main id="main-content" tabIndex={-1}>
              <h1>Contenu</h1>
            </main>
          }
        />
      </Routes>
    </MemoryRouter>
  );

it("names the page without taking initial focus, then focuses new route content", () => {
  renderRoute();
  expect(document.title).toBe("Connexion | My Happy Wallet");
  expect(document.body).toHaveFocus();
  expect(
    screen.getByRole("link", { name: "Aller au contenu principal" })
  ).toHaveAttribute("href", "#main-content");
  const content = screen.getByRole("main");
  fireEvent.click(
    screen.getByRole("link", { name: "Aller au contenu principal" })
  );
  expect(content).toHaveFocus();
  expect(screen.getByRole("main")).toBe(content);
  expect(document.title).toBe("Connexion | My Happy Wallet");
  fireEvent.click(screen.getByRole("link", { name: "Accueil" }));
  expect(document.title).toBe("Tableau de bord | My Happy Wallet");
  expect(screen.getByRole("main")).toHaveFocus();
});

it.each([
  ["/login/?confirmation=private-value", "Connexion"],
  ["/new-password?resetToken=private-value", "Nouveau mot de passe"],
  ["/unknown?email=private-value", "Page introuvable"],
])("uses a fixed title for %s", (entry, title) => {
  renderRoute(entry);
  expect(document.title).toBe(`${title} | My Happy Wallet`);
  expect(document.title).not.toContain("private-value");
});
