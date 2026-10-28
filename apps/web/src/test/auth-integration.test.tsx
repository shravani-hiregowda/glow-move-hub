import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import React from "react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Login from "@/pages/Login";
import { api, ApiError } from "@/lib/api-client";

// Mock API client
vi.mock("@/lib/api-client", () => {
  return {
    api: {
      getMe: vi.fn(),
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      fetchCsrfToken: vi.fn(),
    },
    ApiError: class ApiError extends Error {
      status: number;
      code: string;
      constructor(message: string, status: number, code: string = "API_ERROR") {
        super(message);
        this.status = status;
        this.code = code;
      }
    },
    getCsrfToken: vi.fn(() => "test-token"),
    setCsrfToken: vi.fn(),
  };
});

function ConsumerComponent() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  if (isLoading) return <div>Loading Auth...</div>;
  return (
    <div>
      <div data-testid="auth-status">{isAuthenticated ? "AUTHENTICATED" : "ANONYMOUS"}</div>
      {user && <div data-testid="user-email">{user.email}</div>}
      {user && <div data-testid="user-role">{user.role}</div>}
      <button onClick={logout} data-testid="logout-btn">Log Out</button>
    </div>
  );
}

describe("Frontend AuthContext & ProtectedRoute Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("restores authenticated ADMIN user on mount from /auth/me", async () => {
    vi.mocked(api.getMe).mockResolvedValue({
      user: {
        id: "u-admin",
        email: "admin@example.com",
        role: "ADMIN",
      },
    });

    render(
      <AuthProvider>
        <ConsumerComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("auth-status").textContent).toBe("AUTHENTICATED");
    });

    expect(screen.getByTestId("user-email").textContent).toBe("admin@example.com");
    expect(screen.getByTestId("user-role").textContent).toBe("ADMIN");
  });

  it("initializes as ANONYMOUS when /auth/me returns 401 or null", async () => {
    vi.mocked(api.getMe).mockRejectedValue(new ApiError("Unauthorized", 401, "UNAUTHORIZED"));

    render(
      <AuthProvider>
        <ConsumerComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("auth-status").textContent).toBe("ANONYMOUS");
    });

    expect(screen.queryByTestId("user-email")).toBeNull();
  });

  it("clears user and session on logout", async () => {
    vi.mocked(api.getMe).mockResolvedValue({
      user: {
        id: "u-1",
        email: "member@example.com",
        role: "MEMBER",
      },
    });
    vi.mocked(api.logout).mockResolvedValue();

    render(
      <AuthProvider>
        <ConsumerComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("auth-status").textContent).toBe("AUTHENTICATED");
    });

    fireEvent.click(screen.getByTestId("logout-btn"));

    await waitFor(() => {
      expect(screen.getByTestId("auth-status").textContent).toBe("ANONYMOUS");
    });
    expect(api.logout).toHaveBeenCalled();
  });

  describe("ProtectedRoute Guard", () => {
    it("redirects unauthenticated users to /login", async () => {
      vi.mocked(api.getMe).mockRejectedValue(new ApiError("Unauthorized", 401, "UNAUTHORIZED"));

      render(
        <MemoryRouter initialEntries={["/admin"]}>
          <AuthProvider>
            <Routes>
              <Route path="/login" element={<div>LOGIN_PAGE</div>} />
              <Route element={<ProtectedRoute requireAdmin={true} />}>
                <Route path="/admin" element={<div>ADMIN_SECRET_CONTENT</div>} />
              </Route>
            </Routes>
          </AuthProvider>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText("LOGIN_PAGE")).toBeInTheDocument();
      });
      expect(screen.queryByText("ADMIN_SECRET_CONTENT")).toBeNull();
    });

    it("restricts MEMBER users from accessing admin-only routes", async () => {
      vi.mocked(api.getMe).mockResolvedValue({
        user: {
          id: "u-member",
          email: "member@example.com",
          role: "MEMBER",
        },
      });

      render(
        <MemoryRouter initialEntries={["/admin"]}>
          <AuthProvider>
            <Routes>
              <Route element={<ProtectedRoute requireAdmin={true} />}>
                <Route path="/admin" element={<div>ADMIN_SECRET_CONTENT</div>} />
              </Route>
            </Routes>
          </AuthProvider>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText("Access Restricted")).toBeInTheDocument();
      });
      expect(screen.getByText(/Administrator privileges are required/)).toBeInTheDocument();
      expect(screen.queryByText("ADMIN_SECRET_CONTENT")).toBeNull();
    });

    it("allows ADMIN users to access admin-only routes", async () => {
      vi.mocked(api.getMe).mockResolvedValue({
        user: {
          id: "u-admin",
          email: "admin@example.com",
          role: "ADMIN",
        },
      });

      render(
        <MemoryRouter initialEntries={["/admin"]}>
          <AuthProvider>
            <Routes>
              <Route element={<ProtectedRoute requireAdmin={true} />}>
                <Route path="/admin" element={<div>ADMIN_SECRET_CONTENT</div>} />
              </Route>
            </Routes>
          </AuthProvider>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText("ADMIN_SECRET_CONTENT")).toBeInTheDocument();
      });
    });
  });

  describe("Login Page Interaction", () => {
    it("submits valid credentials and calls api.login", async () => {
      vi.mocked(api.getMe).mockRejectedValue(new ApiError("Unauthorized", 401, "UNAUTHORIZED"));
      vi.mocked(api.login).mockResolvedValue({
        user: { id: "u-admin", email: "admin@example.com", role: "ADMIN" },
      });

      render(
        <MemoryRouter initialEntries={["/login"]}>
          <AuthProvider>
            <Login />
          </AuthProvider>
        </MemoryRouter>
      );

      const emailInput = screen.getByPlaceholderText("Email address");
      const passwordInput = screen.getByPlaceholderText("Password");
      const submitBtn = screen.getByRole("button", { name: /authenticate/i });

      fireEvent.change(emailInput, { target: { value: "admin@example.com" } });
      fireEvent.change(passwordInput, { target: { value: "AdminSecret123!" } });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(api.login).toHaveBeenCalledWith({
          email: "admin@example.com",
          password: "AdminSecret123!",
        });
      });
    });

    it("displays error message on invalid credentials", async () => {
      vi.mocked(api.getMe).mockRejectedValue(new ApiError("Unauthorized", 401, "UNAUTHORIZED"));
      vi.mocked(api.login).mockRejectedValue(
        new ApiError("Invalid email or password.", 401, "INVALID_CREDENTIALS")
      );

      render(
        <MemoryRouter initialEntries={["/login"]}>
          <AuthProvider>
            <Login />
          </AuthProvider>
        </MemoryRouter>
      );

      const emailInput = screen.getByPlaceholderText("Email address");
      const passwordInput = screen.getByPlaceholderText("Password");
      const submitBtn = screen.getByRole("button", { name: /authenticate/i });

      fireEvent.change(emailInput, { target: { value: "bad@example.com" } });
      fireEvent.change(passwordInput, { target: { value: "WrongPass" } });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByText("Invalid email or password.")).toBeInTheDocument();
      });
    });

    it("allows toggling to Register mode and creating member account", async () => {
      vi.mocked(api.getMe).mockRejectedValue(new ApiError("Unauthorized", 401, "UNAUTHORIZED"));
      vi.mocked(api.register).mockResolvedValue({
        user: { id: "u-new", email: "newmember@example.com", role: "MEMBER" },
      });

      render(
        <MemoryRouter initialEntries={["/login"]}>
          <AuthProvider>
            <Login />
          </AuthProvider>
        </MemoryRouter>
      );

      const registerTab = screen.getByRole("button", { name: /register/i });
      fireEvent.click(registerTab);

      expect(screen.getByText("Create Account")).toBeInTheDocument();

      const nameInput = screen.getByPlaceholderText(/Full Name/i);
      const emailInput = screen.getByPlaceholderText("Email address");
      const passwordInput = screen.getByPlaceholderText(/Password \(min\. 8 characters\)/i);
      const submitBtn = screen.getByRole("button", { name: /create member account/i });

      fireEvent.change(nameInput, { target: { value: "New Member" } });
      fireEvent.change(emailInput, { target: { value: "newmember@example.com" } });
      fireEvent.change(passwordInput, { target: { value: "MemberPass123!" } });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(api.register).toHaveBeenCalledWith({
          email: "newmember@example.com",
          password: "MemberPass123!",
          name: "New Member",
        });
      });
    });
  });
});
