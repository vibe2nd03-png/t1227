import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import { AuthProvider, useAuth } from "./AuthContext";

// Mock Supabase
const mockGetSession = vi.fn();
const mockOnAuthStateChange = vi.fn();
const mockSignUp = vi.fn();
const mockSignInWithPassword = vi.fn();
const mockSignInWithOtp = vi.fn();
const mockVerifyOtp = vi.fn();
const mockSignOut = vi.fn();

vi.mock("../supabase", () => ({
  supabase: {
    auth: {
      getSession: () => mockGetSession(),
      onAuthStateChange: (callback) => {
        mockOnAuthStateChange(callback);
        return {
          data: { subscription: { unsubscribe: vi.fn() } },
        };
      },
      signUp: (params) => mockSignUp(params),
      signInWithPassword: (params) => mockSignInWithPassword(params),
      signInWithOtp: (params) => mockSignInWithOtp(params),
      verifyOtp: (params) => mockVerifyOtp(params),
      signOut: () => mockSignOut(),
    },
  },
  SUPABASE_URL: "https://test.supabase.co",
  SUPABASE_ANON_KEY: "test-anon-key",
}));

// Mock logger
vi.mock("../utils/logger", () => ({
  createLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

// Mock fetch for profile operations
globalThis.fetch = vi.fn();

// Test component to access auth context
function TestComponent() {
  const auth = useAuth();
  return (
    <div>
      <span data-testid="loading">{auth.loading ? "true" : "false"}</span>
      <span data-testid="authenticated">
        {auth.isAuthenticated ? "true" : "false"}
      </span>
      <span data-testid="user">{auth.user ? auth.user.id : "null"}</span>
    </div>
  );
}

describe("AuthContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementations
    mockGetSession.mockResolvedValue({ data: { session: null } });
    mockOnAuthStateChange.mockImplementation(() => {});
    mockSignOut.mockResolvedValue({});

    fetch.mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve([]),
      }),
    );
  });

  describe("AuthProvider", () => {
    it("should render children", async () => {
      render(
        <AuthProvider>
          <div data-testid="child">Child</div>
        </AuthProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId("child")).toBeInTheDocument();
      });
    });

    it("should start with loading state", () => {
      mockGetSession.mockImplementation(() => new Promise(() => {})); // Never resolves

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>,
      );

      expect(screen.getByTestId("loading").textContent).toBe("true");
    });

    it("should set loading to false after session check", async () => {
      mockGetSession.mockResolvedValue({ data: { session: null } });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId("loading").textContent).toBe("false");
      });
    });

    it("should be unauthenticated when no session", async () => {
      mockGetSession.mockResolvedValue({ data: { session: null } });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId("authenticated").textContent).toBe("false");
        expect(screen.getByTestId("user").textContent).toBe("null");
      });
    });

    it("should be authenticated when session exists", async () => {
      const mockUser = { id: "user-123", email: "test@test.com" };
      mockGetSession.mockResolvedValue({
        data: {
          session: {
            user: mockUser,
            access_token: "test-token",
          },
        },
      });

      fetch.mockImplementation(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve([{ id: "user-123", nickname: "TestUser" }]),
        }),
      );

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId("authenticated").textContent).toBe("true");
        expect(screen.getByTestId("user").textContent).toBe("user-123");
      });
    });
  });

  describe("useAuth hook", () => {
    it("should provide auth methods", async () => {
      let authContext;

      function CaptureAuth() {
        authContext = useAuth();
        return null;
      }

      render(
        <AuthProvider>
          <CaptureAuth />
        </AuthProvider>,
      );

      await waitFor(() => {
        expect(authContext.signUpWithEmail).toBeTypeOf("function");
        expect(authContext.signInWithEmail).toBeTypeOf("function");
        expect(authContext.signOut).toBeTypeOf("function");
        expect(authContext.sendPhoneOtp).toBeTypeOf("function");
        expect(authContext.verifyPhoneOtp).toBeTypeOf("function");
        expect(authContext.updateProfile).toBeTypeOf("function");
        expect(authContext.addFavoriteRegion).toBeTypeOf("function");
        expect(authContext.removeFavoriteRegion).toBeTypeOf("function");
        expect(authContext.getFavoriteRegions).toBeTypeOf("function");
        expect(authContext.getMyReports).toBeTypeOf("function");
        expect(authContext.deleteMyReport).toBeTypeOf("function");
      });
    });
  });

  describe("signUpWithEmail", () => {
    it("should call supabase signUp", async () => {
      mockSignUp.mockResolvedValue({
        data: { user: { id: "new-user" }, session: { access_token: "token" } },
        error: null,
      });

      let authContext;
      function CaptureAuth() {
        authContext = useAuth();
        return null;
      }

      render(
        <AuthProvider>
          <CaptureAuth />
        </AuthProvider>,
      );

      await waitFor(() => expect(authContext.signUpWithEmail).toBeDefined());

      const result = await authContext.signUpWithEmail(
        "test@test.com",
        "password123",
      );

      expect(mockSignUp).toHaveBeenCalledWith({
        email: "test@test.com",
        password: "password123",
        options: { data: { email_confirmed: true } },
      });
      expect(result.success).toBe(true);
    });

    it("should return error for already registered email", async () => {
      mockSignUp.mockResolvedValue({
        data: { user: { identities: [] }, session: null },
        error: null,
      });

      let authContext;
      function CaptureAuth() {
        authContext = useAuth();
        return null;
      }

      render(
        <AuthProvider>
          <CaptureAuth />
        </AuthProvider>,
      );

      await waitFor(() => expect(authContext.signUpWithEmail).toBeDefined());

      const result = await authContext.signUpWithEmail(
        "existing@test.com",
        "password",
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("이미 가입된");
    });

    it("should handle signup errors", async () => {
      mockSignUp.mockResolvedValue({
        data: null,
        error: { message: "Signup failed" },
      });

      let authContext;
      function CaptureAuth() {
        authContext = useAuth();
        return null;
      }

      render(
        <AuthProvider>
          <CaptureAuth />
        </AuthProvider>,
      );

      await waitFor(() => expect(authContext.signUpWithEmail).toBeDefined());

      const result = await authContext.signUpWithEmail("test@test.com", "pass");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Signup failed");
    });
  });

  describe("signInWithEmail", () => {
    it("should call supabase signInWithPassword", async () => {
      mockSignInWithPassword.mockResolvedValue({
        data: { user: { id: "user-1" }, session: {} },
        error: null,
      });

      let authContext;
      function CaptureAuth() {
        authContext = useAuth();
        return null;
      }

      render(
        <AuthProvider>
          <CaptureAuth />
        </AuthProvider>,
      );

      await waitFor(() => expect(authContext.signInWithEmail).toBeDefined());

      const result = await authContext.signInWithEmail(
        "test@test.com",
        "password",
      );

      expect(mockSignInWithPassword).toHaveBeenCalledWith({
        email: "test@test.com",
        password: "password",
      });
      expect(result.success).toBe(true);
    });

    it("should handle login errors", async () => {
      mockSignInWithPassword.mockResolvedValue({
        data: null,
        error: { message: "Invalid credentials" },
      });

      let authContext;
      function CaptureAuth() {
        authContext = useAuth();
        return null;
      }

      render(
        <AuthProvider>
          <CaptureAuth />
        </AuthProvider>,
      );

      await waitFor(() => expect(authContext.signInWithEmail).toBeDefined());

      const result = await authContext.signInWithEmail(
        "test@test.com",
        "wrong",
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe("Invalid credentials");
    });
  });

  describe("signOut", () => {
    it("should clear user state on signOut", async () => {
      const mockUser = { id: "user-123" };
      mockGetSession.mockResolvedValue({
        data: { session: { user: mockUser, access_token: "token" } },
      });
      mockSignOut.mockResolvedValue({});

      let authContext;
      function CaptureAuth() {
        authContext = useAuth();
        return <TestComponent />;
      }

      render(
        <AuthProvider>
          <CaptureAuth />
        </AuthProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId("authenticated").textContent).toBe("true");
      });

      await act(async () => {
        await authContext.signOut();
      });

      await waitFor(() => {
        expect(screen.getByTestId("authenticated").textContent).toBe("false");
        expect(screen.getByTestId("user").textContent).toBe("null");
      });
    });
  });

  describe("sendPhoneOtp", () => {
    it("should format Korean phone number correctly", async () => {
      mockSignInWithOtp.mockResolvedValue({ error: null });

      let authContext;
      function CaptureAuth() {
        authContext = useAuth();
        return null;
      }

      render(
        <AuthProvider>
          <CaptureAuth />
        </AuthProvider>,
      );

      await waitFor(() => expect(authContext.sendPhoneOtp).toBeDefined());

      await authContext.sendPhoneOtp("01012345678");

      expect(mockSignInWithOtp).toHaveBeenCalledWith({
        phone: "+821012345678",
      });
    });

    it("should not modify already formatted phone", async () => {
      mockSignInWithOtp.mockResolvedValue({ error: null });

      let authContext;
      function CaptureAuth() {
        authContext = useAuth();
        return null;
      }

      render(
        <AuthProvider>
          <CaptureAuth />
        </AuthProvider>,
      );

      await waitFor(() => expect(authContext.sendPhoneOtp).toBeDefined());

      await authContext.sendPhoneOtp("+821012345678");

      expect(mockSignInWithOtp).toHaveBeenCalledWith({
        phone: "+821012345678",
      });
    });
  });

  describe("profile operations", () => {
    it("updateProfile should require authentication", async () => {
      mockGetSession.mockResolvedValue({ data: { session: null } });

      let authContext;
      function CaptureAuth() {
        authContext = useAuth();
        return null;
      }

      render(
        <AuthProvider>
          <CaptureAuth />
        </AuthProvider>,
      );

      await waitFor(() => expect(authContext.updateProfile).toBeDefined());

      const result = await authContext.updateProfile({ nickname: "Test" });

      expect(result.success).toBe(false);
      expect(result.error).toContain("로그인");
    });

    it("getFavoriteRegions should return empty array when not authenticated", async () => {
      mockGetSession.mockResolvedValue({ data: { session: null } });

      let authContext;
      function CaptureAuth() {
        authContext = useAuth();
        return null;
      }

      render(
        <AuthProvider>
          <CaptureAuth />
        </AuthProvider>,
      );

      await waitFor(() => expect(authContext.getFavoriteRegions).toBeDefined());

      const result = await authContext.getFavoriteRegions();

      expect(result).toEqual([]);
    });

    it("getMyReports should return empty array when not authenticated", async () => {
      mockGetSession.mockResolvedValue({ data: { session: null } });

      let authContext;
      function CaptureAuth() {
        authContext = useAuth();
        return null;
      }

      render(
        <AuthProvider>
          <CaptureAuth />
        </AuthProvider>,
      );

      await waitFor(() => expect(authContext.getMyReports).toBeDefined());

      const result = await authContext.getMyReports();

      expect(result).toEqual([]);
    });
  });
});
