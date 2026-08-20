"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Alert } from "@/components/feedback/alert";
import { AcademicShell } from "@/features/academic/components/AcademicShell";
import { AcademicYearForm } from "@/features/academic/components/AcademicYearForm";
import { useMutation } from "@/features/academic/hooks/useMutation";
import { createAcademicYear } from "@/features/academic/api/academic-years";
import type { CreateAcademicYearDto, UpdateAcademicYearDto } from "@/types/academic";

export default function AcademicYearsNewPage() {
  const router = useRouter();
  const { execute, isPending } = useMutation<unknown>();
  const [serverErrors, setServerErrors] = useState<Record<string, string[]> | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async (
    values: CreateAcademicYearDto | UpdateAcademicYearDto,
  ) => {
    setServerErrors(null);
    setFormError(null);
    try {
      await execute(() =>
        createAcademicYear(values as CreateAcademicYearDto),
      );
      router.push("/app/academic-years");
    } catch (e: unknown) {
      const err = e as {
        message?: string;
        validationErrors?: Record<string, string[]>;
      };
      if (err.validationErrors) setServerErrors(err.validationErrors);
      else setFormError(err.message ?? "Could not create the academic year.");
    }
  };

  return (
      <AcademicShell
        title="Academic years"
        description="Create a new academic year for the active school."
        requiredPermissions={["academic_years.create"]}
      >
        {formError ? (
          <Alert
            title="Could not save"
            description={formError}
            variant="danger"
            className="mb-4"
          />
        ) : null}
        <AcademicYearForm
          mode="create"
          defaultActive
          loading={isPending}
          serverErrors={serverErrors}
          onSubmit={handleSubmit}
          onCancel={() => router.back()}
        />
      </AcademicShell>
  );
}
