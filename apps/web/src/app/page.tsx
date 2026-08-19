"use client";

import { useAuth } from "@/components/auth/auth-provider";
import { SchoolSelectionCard } from "@/components/auth/school-selector";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { Alert } from "@/components/feedback/alert";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function Home() {
  const { status, user, activeSchool, requiresSchoolSelection } = useAuth();

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Resolving your session…
      </div>
    );
  }

  if (status === "unauthenticated") {
    return null;
  }

  return (
    <ProtectedRoute>
      {requiresSchoolSelection ? (
        <main className="flex min-h-screen items-center justify-center bg-background p-4">
          <SchoolSelectionCard />
        </main>
      ) : (
        <AppShell
          title="School dashboard"
          description={`Welcome back, ${user?.fullName ?? "user"}. Active school: ${activeSchool?.name ?? "Unassigned"}.`}
        >
          <div className="space-y-6">
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Card>
                <CardHeader>
                  <p className="text-sm font-medium text-muted-foreground">School</p>
                  <p className="text-2xl font-semibold text-foreground">{activeSchool?.name ?? "No school"}</p>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Active school context is resolved from the backend membership state.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <p className="text-sm font-medium text-muted-foreground">Current user</p>
                  <p className="text-2xl font-semibold text-foreground">{user?.fullName ?? "Unknown user"}</p>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{user?.email ?? "No email available"}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <p className="text-sm font-medium text-muted-foreground">Permissions</p>
                  <p className="text-2xl font-semibold text-foreground">{user?.permissionKeys.length ?? 0}</p>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {(user?.permissionKeys ?? []).slice(0, 3).map((permission) => (
                      <Badge key={permission} variant="default">
                        {permission}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <p className="text-sm font-medium text-muted-foreground">Session</p>
                  <p className="text-2xl font-semibold text-foreground">Authenticated</p>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Backend-issued JWT is validated and bound to the active school context.
                  </p>
                </CardContent>
              </Card>
            </section>

            <Alert
              title="Authentication foundation"
              description="The frontend keeps authentication, school context, and permission checks centralized so future ERP modules inherit the same security boundary as the NestJS API."
              variant="default"
            />
          </div>
        </AppShell>
      )}
    </ProtectedRoute>
  );
}
