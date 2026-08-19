"use client";

import type { ReactNode } from "react";

import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { appConfig } from "@/config/app";

const navItems = [
  { label: "Overview", route: "/", requiredPermission: ["dashboard.view"] },
  { label: "Students", route: "/students", requiredPermission: ["students.read"] },
  { label: "Academics", route: "/academics", requiredPermission: ["academics.read"] },
  { label: "Settings", route: "/settings", requiredPermission: ["settings.manage"] },
];

interface AppShellProps {
  children: ReactNode;
  title?: string;
  description?: string;
  actions?: ReactNode;
}

export function AppShell({
  children,
  title = "School ERP foundation",
  description = "Build future ERP modules on a consistent, mobile-friendly foundation.",
  actions,
}: AppShellProps) {
  const { activeSchool, hasAllPermissions, logout, user } = useAuth();

  const visibleNavItems = navItems.filter(
    (item) =>
      item.requiredPermission.length === 0 ||
      hasAllPermissions(item.requiredPermission),
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen max-w-[1600px] flex-col lg:flex-row">
        <aside className="hidden w-72 shrink-0 border-r border-border bg-card/70 lg:flex lg:flex-col">
          <div className="flex items-center gap-3 border-b border-border px-6 py-5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
              S
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">{appConfig.appName}</p>
              <p className="text-xs text-muted-foreground">School ERP</p>
            </div>
          </div>

          <nav className="flex-1 space-y-2 p-4">
            {visibleNavItems.map((item) => (
              <button
                key={item.label}
                type="button"
                className="flex w-full items-center rounded-lg px-3 py-2 text-left text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                {item.label}
              </button>
            ))}
          </nav>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-center justify-between border-b border-border bg-card/80 px-4 py-3 backdrop-blur md:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground lg:hidden">
                S
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active school</p>
                <p className="text-sm font-semibold text-foreground">
                  {activeSchool?.name ?? "No school selected"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground">
                {user?.fullName ?? "User"}
              </div>
              <Button type="button" variant="secondary" size="sm" onClick={() => void logout()}>
                Log out
              </Button>
            </div>
          </header>

          <div className="border-b border-border bg-background px-4 py-5 md:px-6 lg:px-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
                <p className="mt-1 text-sm text-muted-foreground">{description}</p>
              </div>
              {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
            </div>
          </div>

          <main className="flex-1 p-4 md:p-6 lg:p-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
