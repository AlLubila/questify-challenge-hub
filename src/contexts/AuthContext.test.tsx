import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AuthProvider, useAuth } from "./AuthContext";

const authMocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
  signOut: vi.fn(),
  unsubscribe: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: authMocks.getSession,
      onAuthStateChange: authMocks.onAuthStateChange,
      signOut: authMocks.signOut,
    },
  },
}));

type AuthCallback = (event: AuthChangeEvent, session: Session | null) => void;

const session = {
  access_token: "access-token",
  refresh_token: "refresh-token",
  expires_in: 3600,
  token_type: "bearer",
  user: { id: "user-1", email: "player@example.com" },
} as Session;

const AuthProbe = () => {
  const { isLoading, signOut, user } = useAuth();
  const location = useLocation();

  return (
    <div>
      <span data-testid="loading">{String(isLoading)}</span>
      <span data-testid="user">{user?.email ?? "anonymous"}</span>
      <span data-testid="location">{location.pathname}</span>
      <button type="button" onClick={() => void signOut()}>
        Sign out
      </button>
    </div>
  );
};

describe("AuthProvider", () => {
  let authCallback: AuthCallback | undefined;

  beforeEach(() => {
    authMocks.getSession.mockResolvedValue({ data: { session: null } });
    authMocks.signOut.mockResolvedValue({ error: null });
    authMocks.onAuthStateChange.mockImplementation((callback: AuthCallback) => {
      authCallback = callback;
      return { data: { subscription: { unsubscribe: authMocks.unsubscribe } } };
    });
  });

  it("hydrates the current session and unsubscribes on unmount", async () => {
    authMocks.getSession.mockResolvedValue({ data: { session } });
    const view = render(
      <MemoryRouter>
        <AuthProvider>
          <AuthProbe />
        </AuthProvider>
      </MemoryRouter>,
    );

    expect(await screen.findByText("player@example.com")).toBeInTheDocument();
    expect(screen.getByTestId("loading")).toHaveTextContent("false");

    view.unmount();
    expect(authMocks.unsubscribe).toHaveBeenCalledOnce();
  });

  it("reacts to auth events and redirects after signing out", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={["/profile"]}>
        <AuthProvider>
          <AuthProbe />
        </AuthProvider>
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("false"));
    act(() => authCallback?.("TOKEN_REFRESHED", session));
    expect(screen.getByTestId("user")).toHaveTextContent("player@example.com");

    await user.click(screen.getByRole("button", { name: "Sign out" }));
    await waitFor(() => expect(authMocks.signOut).toHaveBeenCalledOnce());
    expect(screen.getByTestId("location")).toHaveTextContent("/auth");
  });
});
