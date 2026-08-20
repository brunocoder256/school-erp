import { AppShell } from "@/components/layout/app-shell";
import { ProtectedRoute } from "@/components/auth/protected-route";
import type { ReactNode } from "react";

interface AcademicShellProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  requiredPermissions?: string[];
}

/**
 * Wraps F05 pages in the authenticated shell. Reuses the F02/F04
 * ProtectedRoute + F01/F03 AppShell so every academic page shares the same
 * navigation, breadcrumbs, permission gating and school context behaviour.
 */
export function AcademicShell({
  title,
  description,
  actions,
  children,
  requiredPermissions = [],
}: AcademicShellProps) {
  return (
    <ProtectedRoute requiredPermissions={requiredPermissions}>
      <AppShell title={title} description={description} actions={actions}>
        {children}
      </AppShell>
    </ProtectedRoute>
  );
}
