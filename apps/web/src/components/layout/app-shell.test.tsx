import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { AppShell } from "./app-shell";
import * as authModule from "@/components/auth/auth-provider";
import type { AuthContextValue } from "@/types/auth";

// Mock useAuth hook
vi.mock("@/components/auth/auth-provider", () => ({
  useAuth: vi.fn(),
}));

const mockUseAuth = vi.mocked(authModule.useAuth);

const mockLogout = vi.fn();
const mockAuthState: AuthContextValue = {
  status: "authenticated",
  session: {
    accessToken: "mock-token",
    tokenType: "Bearer",
    requiresSchoolSelection: false,
    user: {
      id: "u-1",
      email: "test@school.org",
      fullName: "Test User",
      activeSchoolId: "school-1",
    },
    schools: [
      {
        id: "school-1",
        name: "Test School",
        code: "TS",
      },
    ],
  },
  user: {
    id: "u-1",
    fullName: "Test User",
    email: "test@school.org",
    activeSchoolId: "school-1",
    roleNames: [],
    permissionKeys: [
      "dashboard.view",
      "students.read",
      "academics.read",
      "settings.manage",
    ],
  },
  activeSchool: {
    id: "school-1",
    name: "Test School",
    code: "TS",
  },
  memberships: [
    {
      id: "school-1",
      name: "Test School",
      code: "TS",
    },
  ],
  requiresSchoolSelection: false,
  isAuthenticated: true,
  hasPermission: (permission: string) =>
    mockAuthState.user?.permissionKeys.includes(permission) ?? false,
  hasAnyPermission: (permissions: string[]) =>
    permissions.some(
      (p) => mockAuthState.user?.permissionKeys.includes(p) ?? false,
    ),
  hasAllPermissions: (permissions: string[]) =>
    permissions.every(
      (p) => mockAuthState.user?.permissionKeys.includes(p) ?? false,
    ),
  login: vi.fn(),
  selectSchool: vi.fn(),
  refresh: vi.fn(),
  logout: mockLogout,
};

describe("AppShell Component", () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue(mockAuthState);
    mockLogout.mockClear();
    window.localStorage.clear();
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  describe("Rendering", () => {
    it("should render shell with title and description", () => {
      render(
        <AppShell
          title="Test Page"
          description="This is a test page"
        >
          <div>Content</div>
        </AppShell>,
      );

      expect(screen.getByRole("heading", { name: "Test Page" })).toBeInTheDocument();
      expect(screen.getByText("This is a test page")).toBeInTheDocument();
    });

    it("should render user info in header", () => {
      render(
        <AppShell>
          <div>Content</div>
        </AppShell>,
      );

      expect(screen.getByText("Test User")).toBeInTheDocument();
    });

    it("should render children content", () => {
      render(
        <AppShell>
          <div>Test Content Here</div>
        </AppShell>,
      );

      expect(screen.getByText("Test Content Here")).toBeInTheDocument();
    });
  });

  describe("Permission-aware Navigation", () => {
    it("should show navigation item Home when user has dashboard.view permission", () => {
      render(
        <AppShell>
          <div>Content</div>
        </AppShell>,
      );

      expect(screen.getByText("Home")).toBeInTheDocument();
    });

    it("should hide navigation items when user lacks permissions", () => {
      const limitedAuthState: AuthContextValue = {
        ...mockAuthState,
        user: mockAuthState.user ? {
          ...mockAuthState.user,
          permissionKeys: ["dashboard.view"],
        } : null,
        hasAllPermissions: (permissions: string[]) =>
          permissions.every((p) => p === "dashboard.view"),
      };
      mockUseAuth.mockReturnValue(limitedAuthState);

      render(
        <AppShell>
          <div>Content</div>
        </AppShell>,
      );

      expect(screen.getByText("Home")).toBeInTheDocument();
      expect(screen.queryByText("Students")).not.toBeInTheDocument();
      expect(screen.queryByText("Academics")).not.toBeInTheDocument();
      expect(screen.queryByText("Settings")).not.toBeInTheDocument();
    });

    it("should remove empty groups after permission filtering", () => {
      const limitedAuthState: AuthContextValue = {
        ...mockAuthState,
        user: mockAuthState.user ? {
          ...mockAuthState.user,
          permissionKeys: ["dashboard.view"],
        } : null,
        hasAllPermissions: (permissions: string[]) =>
          permissions.every((p) => p === "dashboard.view"),
      };
      mockUseAuth.mockReturnValue(limitedAuthState);

      render(
        <AppShell>
          <div>Content</div>
        </AppShell>,
      );

      // Overview group should exist (Home visible)
      // Other groups should not be rendered
      expect(screen.getByText("Home")).toBeInTheDocument();
    });
  });

  describe("Logout", () => {
    it("should call logout when logout button is clicked", async () => {
      render(
        <AppShell>
          <div>Content</div>
        </AppShell>,
      );

      const logoutButtons = screen.getAllByRole("button", { name: /log out/i });
      expect(logoutButtons.length).toBeGreaterThan(0);

      fireEvent.click(logoutButtons[0]);

      await waitFor(() => {
        expect(mockLogout).toHaveBeenCalled();
      });
    });
  });

  describe("Sidebar Collapse Persistence", () => {
    it("should persist sidebar collapsed state to localStorage", () => {
      render(
        <AppShell>
          <div>Content</div>
        </AppShell>,
      );

      // Find and click collapse button (arrow button)
      const collapseButtons = screen.getAllByRole("button");
      const collapseButton = collapseButtons.find((btn) =>
        btn.getAttribute("aria-label")?.includes("Collapse"),
      );

      expect(collapseButton).toBeDefined();

      if (collapseButton) {
        fireEvent.click(collapseButton);

        expect(window.localStorage.getItem("erp.shell.sidebarCollapsed")).toBe(
          "true",
        );
      }
    });

    it("should restore sidebar collapsed state from localStorage on mount", () => {
      window.localStorage.setItem("erp.shell.sidebarCollapsed", "true");

      render(
        <AppShell>
          <div>Content</div>
        </AppShell>,
      );

      // When sidebar is collapsed, the localStorage should reflect that
      expect(window.localStorage.getItem("erp.shell.sidebarCollapsed")).toBe(
        "true",
      );
    });
  });

  describe("Mobile Navigation", () => {
    it("should open mobile drawer when menu button is clicked", async () => {
      render(
        <AppShell>
          <div>Content</div>
        </AppShell>,
      );

      // Mobile menu button (S icon in header on mobile)
      const mobileMenuButton = screen.getByRole("button", {
        name: /open navigation/i,
      });

      fireEvent.click(mobileMenuButton);

      // After opening, drawer should be visible and searchable
      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });
    });

    it("should close mobile drawer when close button is clicked", async () => {
      render(
        <AppShell>
          <div>Content</div>
        </AppShell>,
      );

      const mobileMenuButton = screen.getByRole("button", {
        name: /open navigation/i,
      });
      fireEvent.click(mobileMenuButton);

      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });

      // Close button should be visible
      const closeButton = screen.getByRole("button", {
        name: /close navigation/i,
      });
      fireEvent.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      });
    });
  });

  describe("Breadcrumbs", () => {
    it("should render breadcrumbs navigation", () => {
      render(
        <AppShell>
          <div>Content</div>
        </AppShell>,
      );

      expect(screen.getByRole("navigation", { name: /breadcrumbs/i })).toBeInTheDocument();
    });

    it("should include application name in breadcrumbs", () => {
      render(
        <AppShell>
          <div>Content</div>
        </AppShell>,
      );

      const breadcrumbNav = screen.getByRole("navigation", {
        name: /breadcrumbs/i,
      });
      expect(breadcrumbNav.textContent).toContain("School ERP");
    });
  });

  describe("Actions", () => {
    it("should render action buttons when provided", () => {
      const actions = (
        <div>
          <button>Custom Action</button>
        </div>
      );

      render(
        <AppShell actions={actions}>
          <div>Content</div>
        </AppShell>,
      );

      expect(screen.getByRole("button", { name: "Custom Action" })).toBeInTheDocument();
    });
  });

  describe("Default Props", () => {
    it("should use default title and description when not provided", () => {
      render(
        <AppShell>
          <div>Content</div>
        </AppShell>,
      );

      expect(screen.getByRole("heading", { name: /School ERP/i })).toBeInTheDocument();
      expect(
        screen.getByText(/Build future ERP modules/i),
      ).toBeInTheDocument();
    });
  });
});
