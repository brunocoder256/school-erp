export interface NavigationItem {
  id: string;
  label: string;
  route: string;
  requiredPermission?: string[];
  exactMatch?: boolean;
}

export interface NavigationGroup {
  id: string;
  label: string;
  items: NavigationItem[];
}

/**
 * Navigation Configuration
 *
 * Uses real backend permission keys from Prisma seed.ts.
 * Each navigation item is gated by requiredPermission check.
 * Placeholder items use actual permission keys to enable safe navigation structure.
 */
export const navigationConfig: NavigationGroup[] = [
  {
    id: "overview",
    label: "Overview",
    items: [
      {
        id: "home",
        label: "Home",
        route: "/app",
        // Home is accessible to authenticated users
        requiredPermission: ["schools.read"],
      },
    ],
  },
  {
    id: "students",
    label: "Students",
    items: [
      {
        id: "students",
        label: "Students",
        route: "/app/students",
        // Viewing students
        requiredPermission: ["students.read"],
      },
    ],
  },
  {
    id: "academics",
    label: "Academic",
    items: [
      {
        id: "academic-structure",
        label: "Academic Structure",
        route: "/app/academic-structure",
        // View academic configuration
        requiredPermission: ["academic_structure.read"],
      },
      {
        id: "academic-years",
        label: "Academic Years",
        route: "/app/academic-years",
        // View academic years
        requiredPermission: ["academic_years.read"],
      },
      {
        id: "subjects",
        label: "Subjects",
        route: "/app/subjects",
        // View subjects
        requiredPermission: ["subjects.read"],
      },
    ],
  },
  {
    id: "teaching",
    label: "Teaching",
    items: [
      {
        id: "teaching-assignments",
        label: "Teaching Assignments",
        route: "/app/teaching-assignments",
        // View/manage teaching assignments
        requiredPermission: ["teacher_assignments.read"],
      },
      {
        id: "attendance",
        label: "Attendance",
        route: "/app/attendance",
        // Mark and view attendance
        requiredPermission: ["attendance.mark"],
      },
      {
        id: "grades",
        label: "Grades",
        route: "/app/grades",
        // Enter and view grades
        requiredPermission: ["grades.enter"],
      },
    ],
  },
  {
    id: "admin",
    label: "Administration",
    items: [
      {
        id: "users",
        label: "Users & Staff",
        route: "/app/users",
        // Manage users
        requiredPermission: ["users.read"],
      },
      {
        id: "staff",
        label: "Staff",
        route: "/app/staff",
        // Manage staff records
        requiredPermission: ["staff.read"],
      },
      {
        id: "roles",
        label: "Roles",
        route: "/app/roles",
        // Manage roles
        requiredPermission: ["roles.read"],
      },
      {
        id: "settings",
        label: "Settings",
        route: "/app/settings",
        // School settings
        requiredPermission: ["schools.update"],
      },
    ],
  },
];

export function normalizePath(path = "") {
  if (!path) return "/";
  return path.replace(/\/+$|\s+/g, "").replace(/\/+/g, "/") || "/";
}

export function isActiveRoute(
  route: string,
  pathname: string,
  exact = false,
): boolean {
  const r = normalizePath(route);
  const p = normalizePath(pathname);
  if (exact) return p === r;
  if (r === "/") return p === "/" || p.startsWith("/");
  // Match by path segment to avoid false positives (/app vs /app-year)
  if (p === r) return true;
  return p.startsWith(r + "/");
}

export function filterNavigationByPermissions(
  groups: NavigationGroup[],
  hasAllPermissions: (permissions: string[]) => boolean,
): NavigationGroup[] {
  return groups
    .map((group) => ({
      ...group,
      items: group.items.filter(
        (item) =>
          !item.requiredPermission ||
          item.requiredPermission.length === 0 ||
          hasAllPermissions(item.requiredPermission),
      ),
    }))
    .filter((g) => g.items.length > 0);
}
