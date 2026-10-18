import React, { useState } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import {
  MemoryRouter,
  Route,
  Routes,
  resolvePath,
  useNavigate,
} from "react-router-dom";
import { afterEach, expect, it } from "vitest";

afterEach(cleanup);
const paths = [
  "//categories",
  "\\\\categories",
  "/\\categories",
  "\\/categories",
];

// Regression for GHSA-wrjc-x8rr-h8h6: mixed leading separators must normalize.
it.each(paths)("normalizes pathname separators in %s", (path) => {
  expect(resolvePath(path)).toMatchObject({ pathname: "/categories" });
});

const NavigateButton = ({ path }) => {
  const navigate = useNavigate();
  const [refused, setRefused] = useState(false);
  return (
    <>
      <h1>Opérations</h1>
      <button
        onClick={() => {
          try {
            navigate(path);
          } catch (error) {
            if (!error.message.includes("External navigation")) throw error;
            setRefused(true);
          }
        }}
      >
        Voir les catégories
      </button>
      {refused && <p role="alert">Navigation refusée</p>}
    </>
  );
};
const renderNavigation = (path) =>
  render(
    <MemoryRouter initialEntries={["/operations"]}>
      <Routes>
        <Route path="/operations" element={<NavigateButton path={path} />} />
        <Route path="/categories" element={<h1>Catégories</h1>} />
      </Routes>
    </MemoryRouter>
  );

it.each(paths)(
  "refuses protocol-relative or mixed-separator navigation %s",
  (path) => {
    renderNavigation(path);
    fireEvent.click(
      screen.getByRole("button", { name: "Voir les catégories" })
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Navigation refusée");
    expect(screen.getByRole("heading", { name: "Opérations" })).toBeVisible();
    expect(
      screen.queryByRole("heading", { name: "Catégories" })
    ).not.toBeInTheDocument();
  }
);
it("keeps ordinary internal navigation working", async () => {
  renderNavigation("/categories");
  fireEvent.click(screen.getByRole("button", { name: "Voir les catégories" }));
  expect(
    await screen.findByRole("heading", { name: "Catégories" })
  ).toBeVisible();
});
