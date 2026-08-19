import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import * as authModule from "@/components/auth/auth-provider";
import { ProtectedRoute } from "@/components/auth/protected-route";

const replaceMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: replaceMock,
  }),
}));

vi.mock("@/components/auth/auth-provider", () => ({
  useAuth: vi.fn(),
}));

const useAuthMock = vi.mocked(authModule.useAuth);

describe("ProtectedRoute", () => {
  it("renders children for authenticated users", () => {
    useAuthMock.mockReturnValue({
      status: "authenticated",
      user: {
        id: "u-1",
        email: "a@school.org",
        fullName: "Ada Lovelace",
        activeSchoolId: "school-1",
        roleNames: ["admin"],
        permissionKeys: ["dashboard.view"],
      },
      hasAllPermissions: (permissions: string[]) => permissions.every((permission) => permission === "dashboard.view"),
    } as unknown as ReturnType<typeof authModule.useAuth>);

    render(
      <ProtectedRoute requiredPermissions={["dashboard.view"]}>
        <div>Protected content</div>
      </ProtectedRoute>,
    );

    expect(screen.getByText("Protected content")).toBeInTheDocument();
  });

  it("renders a forbidden state when permissions are missing", () => {
    useAuthMock.mockReturnValue({
      status: "authenticated",
      user: {
        id: "u-1",
        email: "a@school.org",
        fullName: "Ada Lovelace",
        activeSchoolId: "school-1",
        roleNames: ["admin"],
        permissionKeys: ["dashboard.view"],
      },
      hasAllPermissions: () => false,
    } as unknown as ReturnType<typeof authModule.useAuth>);

    render(
      <ProtectedRoute requiredPermissions={["students.read"]}>
        <div>Protected content</div>
      </ProtectedRoute>,
    );

    expect(screen.getByText(/access denied/i)).toBeInTheDocument();
  });
});
