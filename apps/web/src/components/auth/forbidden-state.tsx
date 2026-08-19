"use client";

import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export function ForbiddenState() {
  const router = useRouter();

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
            Access denied
          </p>
          <h1 className="text-3xl font-semibold text-foreground">You do not have permission to access this area.</h1>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Your account is authenticated, but the active school context does not allow this page.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button type="button" variant="secondary" onClick={() => router.back()}>
              Go back
            </Button>
            <Button type="button" onClick={() => router.push("/")}>
              Go to home
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
