import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AuthProvider, useAuth } from "@/components/auth/auth-provider";
import { ApiError } from "@/lib/api/client";
import { fetchCurrentUser } from "@/lib/api/auth";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
}));

vi.mock("@/lib/api/auth", () => ({
  fetchCurrentUser: vi.fn(),
  loginRequest: vi.fn(),
  selectSchoolRequest: vi.fn(),
}));

function Consumer() {
  const auth = useAuth();

  return (
    <div>
      <p>{auth.status}</p>
      <p>{auth.user?.fullName ?? "no-user"}</p>
    </div>
  );
}

describe("AuthProvider", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    vi.clearAllMocks();
  });

  it("loads the session and marks the user as authenticated", async () => {
    vi.mocked(fetchCurrentUser).mockResolvedValue({
      id: "u-1",
      email: "user@example.com",
      fullName: "Ada Lovelace",
      activeSchoolId: "school-1",
      roleNames: ["school-admin"],
      permissionKeys: ["dashboard.view"],
    });
    window.sessionStorage.setItem(
      "school-erp-auth-session",
      JSON.stringify({
        accessToken: "token-1",
        tokenType: "Bearer",
        requiresSchoolSelection: false,
        user: { id: "u-1", email: "user@example.com", fullName: "Ada Lovelace", activeSchoolId: "school-1" },
        schools: [{ id: "school-1", name: "Mukono High School", code: "MHS" }],
      }),
    );

    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    );

    await waitFor(() => expect(screen.getByText("authenticated")).toBeInTheDocument());
    expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
  });

  it("clears the session when the server rejects a stale token", async () => {
    vi.mocked(fetchCurrentUser).mockRejectedValue(new ApiError("Your session has expired.", 401));
    window.sessionStorage.setItem(
      "school-erp-auth-session",
      JSON.stringify({
        accessToken: "expired-token",
        tokenType: "Bearer",
        requiresSchoolSelection: false,
        user: { id: "u-2", email: "expired@example.com", fullName: "Expired User", activeSchoolId: "school-1" },
        schools: [{ id: "school-1", name: "Mukono High School", code: "MHS" }],
      }),
    );

    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    );

    await waitFor(() => expect(screen.getByText("unauthenticated")).toBeInTheDocument());
    expect(window.sessionStorage.getItem("school-erp-auth-session")).toBeNull();
  });
});
