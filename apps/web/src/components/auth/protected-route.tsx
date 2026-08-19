"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import { useAuth } from "@/components/auth/auth-provider";
import { ForbiddenState } from "@/components/auth/forbidden-state";

interface ProtectedRouteProps {
  children: ReactNode;
  requiredPermissions?: string[];
}

export function ProtectedRoute({
  children,
  requiredPermissions = [],
}: ProtectedRouteProps) {
  const router = useRouter();
  const { status, user, hasAllPermissions } = useAuth();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
    }
  }, [router, status]);

  if (status === "loading") {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-muted-foreground">
        Resolving your session…
      </div>
    );
  }

  if (status === "unauthenticated") {
    return null;
  }

  if (requiredPermissions.length > 0 && user && !hasAllPermissions(requiredPermissions)) {
    return <ForbiddenState />;
  }

  return <>{children}</>;
}
