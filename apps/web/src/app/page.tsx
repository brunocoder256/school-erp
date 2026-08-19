import { Alert } from "@/components/feedback/alert";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { hasPermission } from "@/lib/permissions";

const foundationAreas = [
  "Responsive shell",
  "Design tokens",
  "Reusable UI primitives",
  "API client foundation",
  "Permission-aware UI",
];

const permissionSet = [
  "dashboard.view",
  "students.read",
  "academics.read",
  "settings.manage",
];

export default function Home() {
  return (
    <AppShell
      title="Frontend foundation"
      description="A clean, mobile-first shell for the School ERP product. Future feature modules can build on top of this without repeating layout, styling or API conventions."
      actions={
        <>
          <Button variant="secondary">Preview</Button>
          <Button>Apply foundation</Button>
        </>
      }
    >
      <div className="space-y-6">
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card>
            <CardHeader>
              <p className="text-sm font-medium text-muted-foreground">Layout</p>
              <p className="text-2xl font-semibold text-foreground">Desktop + mobile</p>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                The shell adapts from desktop sidebar patterns to compact mobile navigation.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <p className="text-sm font-medium text-muted-foreground">Design system</p>
              <p className="text-2xl font-semibold text-foreground">Tokenized</p>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {foundationAreas.slice(0, 3).map((item) => (
                  <Badge key={item} variant="default">
                    {item}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <p className="text-sm font-medium text-muted-foreground">API readiness</p>
              <p className="text-2xl font-semibold text-foreground">Typed client</p>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Requests are centralized with a typed fetch foundation and environment-based config.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <p className="text-sm font-medium text-muted-foreground">Permissions</p>
              <p className="text-2xl font-semibold text-foreground">UX-aware</p>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {hasPermission("students.read", permissionSet) ? "Access ready" : "Access restricted"}
              </p>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Core primitives</p>
                  <h2 className="text-xl font-semibold text-foreground">Composable UI</h2>
                </div>
                <Badge variant="success">Ready</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-3">
                <Button size="sm">Primary action</Button>
                <Button variant="secondary" size="sm">
                  Secondary action
                </Button>
                <Button variant="ghost" size="sm">
                  Ghost action
                </Button>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label htmlFor="school-search" className="text-sm font-medium text-foreground">
                    School search
                  </label>
                  <Input id="school-search" placeholder="Search school or class" />
                </div>
                <div className="space-y-2">
                  <label htmlFor="term" className="text-sm font-medium text-foreground">
                    Current term
                  </label>
                  <Input id="term" defaultValue="Term 1" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <p className="text-sm font-medium text-muted-foreground">Permission foundation</p>
              <h2 className="text-xl font-semibold text-foreground">Access model</h2>
            </CardHeader>
            <CardContent className="space-y-3">
              {permissionSet.map((permission) => (
                <div key={permission} className="flex items-center justify-between gap-4 rounded-lg bg-muted/40 px-3 py-2">
                  <span className="text-sm text-foreground">{permission}</span>
                  <Badge variant={hasPermission(permission, permissionSet) ? "success" : "warning"}>
                    {hasPermission(permission, permissionSet) ? "Allowed" : "Blocked"}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>

        <Alert
          title="Foundation milestone only"
          description="This page intentionally avoids feature-specific ERP screens. It sets up the shell, tokens, UI system, and client readiness required for future modules."
          variant="default"
        />
      </div>
    </AppShell>
  );
}
