import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ForgotPassword from "../../src/js/pages/ForgotPassword";
import Login from "../../src/js/pages/Login";
import NewPassword from "../../src/js/pages/NewPassword";
import Register from "../../src/js/pages/Register";

const mocks = vi.hoisted(() => ({
  authState: {},
  dispatch: vi.fn(),
  navigate: vi.fn(),
  searchParams: new URLSearchParams(),
  setSearchParams: vi.fn(),
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
}));

vi.mock("react-redux", () => ({
  useDispatch: () => mocks.dispatch,
  useSelector: (selector) => selector({ auth: mocks.authState }),
}));

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal();

  return {
    ...actual,
    useLocation: () => ({
      search: mocks.searchParams.toString(),
      state: null,
    }),
    useNavigate: () => mocks.navigate,
    useSearchParams: () => [mocks.searchParams, mocks.setSearchParams],
  };
});

vi.mock("react-toastify", () => ({
  toast: {
    error: mocks.toastError,
    isActive: () => false,
    success: mocks.toastSuccess,
  },
}));

vi.mock("../../src/js/slices/auth/authSlice", () => ({
  forgotPsswdApi: (payload) => ({ type: "auth/forgotPassword", payload }),
  loginApi: (payload) => ({ type: "auth/login", payload }),
  newPsswdApi: (payload) => ({ type: "auth/newPassword", payload }),
  register: (payload) => ({ type: "auth/register", payload }),
  reset: () => ({ type: "auth/reset" }),
  resetPsswdApi: (payload) => ({ type: "auth/resetPassword", payload }),
}));

const renderForm = (component) => {
  return render(<MemoryRouter>{component}</MemoryRouter>);
};

beforeEach(() => {
  mocks.searchParams = new URLSearchParams();
  mocks.authState = {
    isAuthenticated: false,
    isEmailSent: false,
    isError: false,
    isLoading: false,
    isSuccess: false,
    isSuccessConfirmNewPassword: false,
    message: "",
    user: null,
  };
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("authentication forms", () => {
  it("shows the registration error returned by the API", () => {
    mocks.authState = {
      ...mocks.authState,
      isError: true,
      message: "Validators error: password is invalid",
    };

    renderForm(<Register />);

    expect(mocks.toastError).toHaveBeenCalledWith(
      "Validators error: password is invalid"
    );
    expect(mocks.toastError).not.toHaveBeenCalledWith("User already exists");
  });

  it("dispatches login credentials", () => {
    renderForm(<Login />);

    fireEvent.change(screen.getByPlaceholderText("Entrez votre email"), {
      target: { value: "user@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("Entrez mot de passe"), {
      target: { value: "secret" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Connexion" }));

    expect(mocks.dispatch).toHaveBeenCalledWith({
      type: "auth/login",
      payload: { email: "user@example.com", password: "secret" },
    });
  });

  it.each([
    [
      "already-used",
      "Ce lien de confirmation a déjà été utilisé. Vous pouvez vous connecter.",
    ],
    [
      "invalid-or-expired",
      "Ce lien de confirmation est invalide ou a expiré. Recommencez l’inscription pour recevoir un nouveau lien.",
    ],
  ])(
    "shows and consumes the %s confirmation result",
    (code, expectedMessage) => {
      mocks.searchParams = new URLSearchParams({
        confirmation: code,
        source: "email",
      });

      renderForm(<Login />);

      expect(screen.getByRole("alert")).toHaveTextContent(expectedMessage);
      expect(mocks.setSearchParams).toHaveBeenCalledTimes(1);
      const [cleanedSearchParams, options] =
        mocks.setSearchParams.mock.calls[0];
      expect(cleanedSearchParams.get("confirmation")).toBeNull();
      expect(cleanedSearchParams.get("source")).toBe("email");
      expect(options).toEqual({ replace: true });
    }
  );

  it("ignores an unknown confirmation result while cleaning the URL", () => {
    mocks.searchParams = new URLSearchParams({ confirmation: "unexpected" });

    renderForm(<Login />);

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    const [cleanedSearchParams] = mocks.setSearchParams.mock.calls[0];
    expect(cleanedSearchParams.has("confirmation")).toBe(false);
  });

  it("keeps the existing registration success feedback and cleans its query", () => {
    mocks.searchParams = new URLSearchParams({
      success: "true",
      message: "registrationok",
    });

    renderForm(<Login />);

    expect(mocks.toastSuccess).toHaveBeenCalledWith(
      "Votre compte a bien été créé !"
    );
    const [cleanedSearchParams, options] = mocks.setSearchParams.mock.calls[0];
    expect(cleanedSearchParams.has("success")).toBe(false);
    expect(cleanedSearchParams.has("message")).toBe(false);
    expect(options).toEqual({ replace: true });
  });

  it("dispatches matching registration data", () => {
    renderForm(<Register />);

    const changeField = (placeholder, value) => {
      fireEvent.change(screen.getByPlaceholderText(placeholder), {
        target: { value },
      });
      expect(screen.getByPlaceholderText(placeholder)).toHaveValue(value);
    };

    changeField("Entrez prénom", "Happy");
    changeField("Entrez votre nom", "Wallet");
    changeField("Entrez votre email", "user@example.com");
    changeField("Entrez mot de passe", "secret");
    changeField("Confirmez votre mot de passe", "secret");

    fireEvent.click(screen.getByRole("button", { name: "S'enregistrer" }));

    expect(mocks.dispatch).toHaveBeenCalledWith({
      type: "auth/register",
      payload: {
        firstname: "Happy",
        lastname: "Wallet",
        email: "user@example.com",
        password: "secret",
        confirmpassword: "secret",
      },
    });
  });

  it("dispatches a password reset request", () => {
    renderForm(<ForgotPassword />);

    fireEvent.change(screen.getByPlaceholderText("Entrez votre email"), {
      target: { value: "user@example.com" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Changer de mot de passe" })
    );

    expect(mocks.dispatch).toHaveBeenCalledWith({
      type: "auth/forgotPassword",
      payload: { email: "user@example.com" },
    });
  });

  it("dispatches a new password and its confirmation", () => {
    renderForm(<NewPassword />);

    fireEvent.change(screen.getByPlaceholderText("Entrez mot de passe"), {
      target: { value: "new-secret" },
    });
    fireEvent.change(
      screen.getByPlaceholderText("Confirmez votre mot de passe"),
      { target: { value: "new-secret" } }
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: "Confirmation du nouveau mot de passe",
      })
    );

    expect(mocks.dispatch).toHaveBeenCalledWith({
      type: "auth/newPassword",
      payload: {
        password: "new-secret",
        confirmPassword: "new-secret",
      },
    });
  });
});
