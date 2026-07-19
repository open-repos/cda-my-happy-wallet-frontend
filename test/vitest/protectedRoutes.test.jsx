import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import {
  MemoryRouter,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ProtectedLayout } from "../../src/js/components/ProtectedLayout";
import { RequireAuth } from "../../src/js/components/requireAuth";

const mocks = vi.hoisted(() => ({
  getLocalStorageItem: vi.fn(),
}));

vi.mock("../../src/utils/localstorage", () => ({
  getLocalStorageItem: mocks.getLocalStorageItem,
}));

vi.mock("../../src/js/components/SideBar", () => ({
  default: () => <nav>Protected sidebar</nav>,
}));

const LoginDestination = () => {
  const location = useLocation();
  return <div>Login from:{location.state?.from?.pathname}</div>;
};

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("protected navigation", () => {
  it("redirects an anonymous user and preserves the requested location", () => {
    mocks.getLocalStorageItem.mockReturnValue(null);

    render(
      <MemoryRouter initialEntries={["/private"]}>
        <Routes>
          <Route path="/login" element={<LoginDestination />} />
          <Route
            path="/private"
            element={
              <RequireAuth>
                <div>Private content</div>
              </RequireAuth>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText("Login from:/private")).toBeInTheDocument();
    expect(screen.queryByText("Private content")).not.toBeInTheDocument();
  });

  it("renders protected content for a stored user", () => {
    mocks.getLocalStorageItem.mockReturnValue({ accessToken: "fake-token" });

    render(
      <MemoryRouter initialEntries={["/private"]}>
        <RequireAuth>
          <div>Private content</div>
        </RequireAuth>
      </MemoryRouter>
    );

    expect(screen.getByText("Private content")).toBeInTheDocument();
  });

  it("composes the sidebar and protected page", () => {
    mocks.getLocalStorageItem.mockReturnValue({ accessToken: "fake-token" });

    render(
      <MemoryRouter>
        <ProtectedLayout>
          <main>Protected page</main>
        </ProtectedLayout>
      </MemoryRouter>
    );

    expect(screen.getByRole("navigation")).toHaveTextContent(
      "Protected sidebar"
    );
    expect(screen.getByText("Protected page")).toBeInTheDocument();
  });
});
