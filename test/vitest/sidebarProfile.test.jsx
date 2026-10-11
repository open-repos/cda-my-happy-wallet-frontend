import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import Sidebar from "../../src/js/components/SideBar";
import { reset } from "../../src/js/slices/auth/authSlice";

const dispatch = vi.hoisted(() => vi.fn());

vi.mock("react-redux", () => ({
  useSelector: (select) =>
    select({
      auth: {
        user: { payload: { user: { firstname: "Happy", lastname: "Wallet" } } },
      },
    }),
  useDispatch: () => dispatch,
}));

const renderSidebar = () =>
  render(
    <MemoryRouter initialEntries={["/home"]}>
      <Routes>
        <Route path="/home" element={<Sidebar />} />
        <Route path="/login" element={<h1>Connexion</h1>} />
      </Routes>
    </MemoryRouter>
  );

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("Sidebar profile actions", () => {
  it("opens the profile panel from a named button", () => {
    renderSidebar();

    const toggle = screen.getByRole("button", { name: "Afficher le profil" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    const panel = document.getElementById(toggle.getAttribute("aria-controls"));
    expect(panel).not.toBeNull();

    fireEvent.click(toggle);

    expect(
      screen.getByRole("button", { name: "Masquer le profil" })
    ).toHaveAttribute("aria-expanded", "true");
    expect(
      screen.getByRole("link", { name: /^voir\sprofil$/ })
    ).toHaveAttribute("href", "/profil");
  });

  it("logs out from the button itself, not only its image", () => {
    renderSidebar();
    fireEvent.click(screen.getByRole("button", { name: "Afficher le profil" }));

    fireEvent.click(screen.getByRole("button", { name: "Se déconnecter" }));

    expect(dispatch).toHaveBeenCalledTimes(2);
    // logout() (thunk) puis reset() de l'état d'authentification.
    expect(typeof dispatch.mock.calls[0][0]).toBe("function");
    expect(dispatch).toHaveBeenNthCalledWith(2, reset());
    expect(
      screen.getByRole("heading", { name: "Connexion" })
    ).toBeInTheDocument();
  });
});
