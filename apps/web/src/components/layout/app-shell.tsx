"use client";

import type { ReactNode } from "react";

import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { appConfig } from "@/config/app";
import {
  filterNavigationByPermissions,
  isActiveRoute,
  navigationConfig,
  normalizePath,
} from "@/navigation/navigation";
import { useEffect, useMemo, useState, useRef } from "react";

const SIDEBAR_LOCALSTORAGE_KEY = "erp.shell.sidebarCollapsed";

interface AppShellProps {
  children: ReactNode;
  title?: string;
  description?: string;
  actions?: ReactNode;
}

export function AppShell({
  children,
  title = "School ERP",
  description = "Build future ERP modules on a consistent, mobile-friendly foundation.",
  actions,
}: AppShellProps) {
  const { activeSchool, hasAllPermissions, logout, user } = useAuth();
  const pathname = typeof window !== "undefined" ? window.location.pathname : "/app";

  // Sidebar collapsed state persisted to localStorage
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      if (typeof window === "undefined") return false;
      const raw = window.localStorage.getItem(SIDEBAR_LOCALSTORAGE_KEY);
      return raw === "true";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(SIDEBAR_LOCALSTORAGE_KEY, String(collapsed));
    } catch {
      // ignore
    }
  }, [collapsed]);

  // Mobile drawer state
  const [mobileOpen, setMobileOpen] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (mobileOpen) {
      // lock scroll
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      // focus close button for accessibility
      requestAnimationFrame(() => closeButtonRef.current?.focus());
      return () => {
        document.body.style.overflow = prev;
      };
    }
    return;
  }, [mobileOpen]);

  // Filter navigation by permissions
  const visibleGroups = useMemo(() => {
    return filterNavigationByPermissions(navigationConfig, hasAllPermissions);
  }, [hasAllPermissions]);

  function navigate(route: string) {
    if (typeof window !== "undefined") {
      try {
        window.history.pushState({}, "", route);
        // let listeners know
        window.dispatchEvent(new PopStateEvent("popstate"));
      } catch {
        window.location.assign(route);
      }
    }

    setMobileOpen(false);
  }

  // Breadcrumbs generation (simple, based on pathname segments)
  const breadcrumbs = useMemo(() => {
    const p = normalizePath(pathname ?? "/");
    const parts = p.split("/").filter(Boolean);
    const crumbs = [{ label: appConfig.appName, route: "/app" }];
    let acc = "";
    parts.forEach((part: string) => {
      acc += "/" + part;
      crumbs.push({ label: part.replace(/-/g, " "), route: acc });
    });
    return crumbs;
  }, [pathname]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen max-w-[1600px] flex-col lg:flex-row">
        {/* Desktop sidebar */}
        <aside
          className={`hidden lg:flex lg:flex-col border-r border-border bg-card/70 transition-all ${
            collapsed ? "w-20" : "w-72"
          } shrink-0`}
          aria-hidden={false}
        >
          <div className="flex items-center gap-3 border-b border-border px-4 py-4">
            <div
              className={`flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground ${
                collapsed ? "mx-auto" : ""
              }`}
            >
              S
            </div>
            {!collapsed ? (
              <div>
                <p className="text-sm font-semibold text-foreground">{appConfig.appName}</p>
                <p className="text-xs text-muted-foreground">School ERP</p>
              </div>
            ) : null}
          </div>

          <nav className="flex-1 overflow-auto p-3" aria-label="Main navigation">
            {visibleGroups.map((group) => (
              <div key={group.id} className="mb-4">
                {!collapsed ? (
                  <div className="px-2 pb-1 text-xs font-semibold uppercase text-muted-foreground">{group.label}</div>
                ) : null}
                <div className="mt-1 space-y-1">
                  {group.items.map((item) => {
                    const exact = (item as { exactMatch?: boolean }).exactMatch ?? false;
                    const active = isActiveRoute(item.route, pathname ?? "/", exact);
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => navigate(item.route)}
                        aria-current={active ? "page" : undefined}
                        className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                          active
                            ? "bg-accent text-foreground font-medium"
                            : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
                        }`}
                      >
                        {/* placeholder for icon */}
                        <span className="inline-block h-4 w-4 rounded-sm bg-muted-foreground/30"></span>
                        {!collapsed ? <span className="truncate">{item.label}</span> : null}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          <div className="border-t border-border p-3">
            <div className="flex items-center justify-between gap-2">
              {!collapsed ? (
                <div className="text-xs text-muted-foreground">{activeSchool?.name ?? "No school"}</div>
              ) : null}
              <div className="flex items-center gap-2">
                <button
                  aria-pressed={collapsed}
                  aria-label={collapsed ? "Expand navigation" : "Collapse navigation"}
                  className="rounded-md px-2 py-1 text-sm"
                  onClick={() => setCollapsed((s) => !s)}
                >
                  {collapsed ? "→" : "←"}
                </button>
                <Button type="button" variant="ghost" size="sm" onClick={() => void logout()}>
                  {!collapsed ? "Log out" : ""}
                </Button>
              </div>
            </div>
          </div>
        </aside>

        {/* Mobile drawer */}
        {mobileOpen ? (
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-50 flex"
            onClick={() => setMobileOpen(false)}
          >
            <div className="absolute inset-0 bg-black/40" aria-hidden="true"></div>
            <aside
              className="relative z-10 w-80 max-w-full bg-card p-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-foreground">{appConfig.appName}</p>
                  <p className="text-xs text-muted-foreground">{activeSchool?.name ?? "No school"}</p>
                </div>
                <button
                  ref={closeButtonRef}
                  aria-label="Close navigation"
                  className="rounded-md px-2 py-1"
                  onClick={() => setMobileOpen(false)}
                >
                  Close
                </button>
              </div>

              <nav className="mt-4 space-y-3" aria-label="Mobile navigation">
                {visibleGroups.map((group) => (
                  <div key={group.id}>
                    <div className="text-xs font-semibold uppercase text-muted-foreground">{group.label}</div>
                    <div className="mt-2 space-y-1">
                      {group.items.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => navigate(item.route)}
                          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
                        >
                          <span className="inline-block h-4 w-4 rounded-sm bg-muted-foreground/30"></span>
                          <span>{item.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </nav>
            </aside>
          </div>
        ) : null}

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-center justify-between border-b border-border bg-card/80 px-4 py-3 backdrop-blur md:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              <button
                className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground lg:hidden"
                aria-label="Open navigation"
                onClick={() => setMobileOpen(true)}
              >
                S
              </button>

              <div>
                <p className="text-sm font-medium text-muted-foreground">{activeSchool ? "Active school" : "No school"}</p>
                <p className="text-sm font-semibold text-foreground">{activeSchool?.name ?? "No school selected"}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground">{user?.fullName ?? "User"}</div>
              <Button type="button" variant="secondary" size="sm" onClick={() => void logout()}>
                Log out
              </Button>
            </div>
          </header>

          <div className="border-b border-border bg-background px-4 py-3 md:px-6 lg:px-8">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <nav aria-label="Breadcrumbs" className="mb-2">
                  <ol className="flex items-center gap-2 text-sm text-muted-foreground">
                    {breadcrumbs.map((c, i) => (
                      <li key={c.route} className="inline-flex items-center">
                        {i !== 0 ? <span className="text-muted-foreground">/</span> : null}
                        <button
                          type="button"
                          onClick={() => navigate(c.route)}
                          className={`ml-2 text-sm ${i === breadcrumbs.length - 1 ? "font-semibold text-foreground" : ""}`}
                        >
                          {c.label}
                        </button>
                      </li>
                    ))}
                  </ol>
                </nav>

                <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
                <p className="mt-1 text-sm text-muted-foreground">{description}</p>
              </div>

              {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
            </div>
          </div>

          <main className="flex-1 overflow-auto p-4 md:p-6 lg:p-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
