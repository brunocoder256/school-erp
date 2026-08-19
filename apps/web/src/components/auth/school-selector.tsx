"use client";

import { useState } from "react";

import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export function SchoolSelectionCard() {
  const { memberships, selectSchool, status } = useAuth();
  const [selectedSchoolId, setSelectedSchoolId] = useState<string | null>(
    memberships[0]?.id ?? null,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (memberships.length === 0) {
    return null;
  }

  async function handleSubmit() {
    if (!selectedSchoolId) {
      setError("Please choose a school to continue.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      await selectSchool(selectedSchoolId);
    } catch (apiError) {
      const message =
        apiError instanceof Error ? apiError.message : "Unable to select this school.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          School context required
        </p>
        <h1 className="text-3xl font-semibold text-foreground">Choose your school</h1>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Your account belongs to multiple schools. Select the one you want to work in.
        </p>

        <div className="space-y-3" aria-label="School memberships list">
          {memberships.map((school) => {
            const isSelected = selectedSchoolId === school.id;

            return (
              <button
                key={school.id}
                type="button"
                className={[
                  "flex w-full items-center justify-between rounded-lg border p-4 text-left transition-colors",
                  isSelected
                    ? "border-primary bg-primary/5 text-foreground"
                    : "border-border bg-background hover:bg-accent",
                ].join(" ")}
                onClick={() => setSelectedSchoolId(school.id)}
                aria-pressed={isSelected}
              >
                <div>
                  <p className="font-medium">{school.name}</p>
                  <p className="text-sm text-muted-foreground">{school.code}</p>
                </div>
                <span className="text-sm text-muted-foreground">
                  {isSelected ? "Selected" : "Select"}
                </span>
              </button>
            );
          })}
        </div>

        {error ? (
          <p className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}

        <Button type="button" onClick={handleSubmit} disabled={isSubmitting || status === "loading"} className="w-full">
          {isSubmitting ? "Selecting school…" : "Continue"}
        </Button>
      </CardContent>
    </Card>
  );
}
