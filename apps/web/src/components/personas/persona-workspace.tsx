"use client";

import { useRouter } from "next/navigation";
import { useMemo } from "react";

import { usePersona } from "@/personas/hooks/usePersona";
import { getPersonaLabel } from "@/personas/persona-resolver";
import { Alert } from "@/components/feedback/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export function PersonaWorkspace() {
  const router = useRouter();
  const {
    primaryPersona,
    profile,
    isLoading,
    isAuthenticated,
    getWorkspace,
    getQuickActions,
  } = usePersona();

  const workspace = useMemo(() => {
    if (!isAuthenticated) return null;
    return getWorkspace(primaryPersona);
  }, [primaryPersona, isAuthenticated, getWorkspace]);

  const quickActions = useMemo(() => {
    if (!workspace) return [];
    return getQuickActions(workspace.primaryActions);
  }, [workspace, getQuickActions]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-7 w-48 animate-pulse rounded-md bg-muted"></div>
        <div className="h-4 w-80 animate-pulse rounded-md bg-muted"></div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="h-24 animate-pulse rounded-lg bg-muted"></div>
          <div className="h-24 animate-pulse rounded-lg bg-muted"></div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !workspace) {
    return null;
  }

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-1">
        <div className="flex items-center gap-3">
          <Badge variant="default">{getPersonaLabel(primaryPersona)}</Badge>
          {profile.all.length > 1 ? (
            <span className="text-xs text-muted-foreground">
              +{profile.all.length - 1} additional role
              {profile.all.length - 1 > 1 ? "s" : ""}
            </span>
          ) : null}
        </div>
        <h2 className="text-2xl font-semibold text-foreground">
          {workspace.title}
        </h2>
        <p className="text-sm text-muted-foreground">
          {workspace.description}
        </p>
      </header>

      {quickActions.length > 0 ? (
        <div className="flex flex-wrap gap-3">
          {quickActions.map((action) => (
            <Button
              key={action.id}
              variant={action.comingSoon ? "secondary" : "primary"}
              size="md"
              onClick={() => {
                if (!action.comingSoon) {
                  router.push(action.route);
                }
              }}
              disabled={!!action.comingSoon}
            >
              {action.label}
              {action.comingSoon ? " (Coming soon)" : null}
            </Button>
          ))}
        </div>
      ) : null}

      {workspace.sections.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {workspace.sections.map((section) => (
            <Card key={section.id}>
              <CardHeader>
                <p className="text-sm font-medium text-muted-foreground">
                  #{section.id}
                </p>
                <p className="text-lg font-semibold text-foreground">
                  {section.label}
                </p>
              </CardHeader>
              {section.description ? (
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {section.description}
                  </p>
                </CardContent>
              ) : null}
            </Card>
          ))}
        </div>
      ) : (
        <Alert
          title="No workspace sections"
          description="No workspace sections are available for your current permissions. Contact your administrator to assign roles."
          variant="default"
        />
      )}
    </section>
  );
}
