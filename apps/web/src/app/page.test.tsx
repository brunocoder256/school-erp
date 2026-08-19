import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import Home from "@/app/page";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

vi.mock("@/components/auth/auth-provider", () => ({
  useAuth: () => ({
    status: "authenticated",
    user: {
      id: "u-1",
      fullName: "Ada Lovelace",
      email: "ada@school.org",
      activeSchoolId: "school-1",
      permissionKeys: ["dashboard.view"],
    },
    activeSchool: { id: "school-1", name: "Mukono High School", code: "MHS" },
    requiresSchoolSelection: false,
    hasAllPermissions: (permissions: string[]) => permissions.every((permission) => permission === "dashboard.view"),
    logout: vi.fn(),
  }),
}));

vi.mock("@/components/auth/protected-route", () => ({
  ProtectedRoute: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe("Home page", () => {
  it("renders the authenticated dashboard shell", () => {
    render(<Home />);

    expect(screen.getByRole("heading", { name: /school dashboard/i })).toBeInTheDocument();
    expect(screen.getAllByText(/mukono high school/i).length).toBeGreaterThan(0);
  });
});
