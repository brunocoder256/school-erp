"use client";

import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { Alert } from "@/components/feedback/alert";
import { Spinner } from "@/components/feedback/spinner";
import { ErrorState } from "@/components/ui/error-state";
import { AcademicShell } from "@/features/academic/components/AcademicShell";
import { AcademicYearForm } from "@/features/academic/components/AcademicYearForm";
import { useMutation } from "@/features/academic/hooks/useMutation";
import { useAsync } from "@/features/academic/hooks/useAsync";
import { getAcademicYear, updateAcademicYear } from "@/features/academic/api/academic-years";
import type {
  AcademicYearResponse,
  CreateAcademicYearDto,
  UpdateAcademicYearDto,
} from "@/types/academic";

export default function AcademicYearEditPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";

  const { data: year, status, error, execute: load } = useAsync<AcademicYearResponse>();
  const { execute: save, isPending } = useMutation<unknown>();
  const [serverErrors, setServerErrors] = useState<Record<string, string[]> | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      load(() => getAcademicYear(id));
    }
  }, [id, load]);

  const handleSubmit = async (
    values: CreateAcademicYearDto | UpdateAcademicYearDto,
  ) => {
    setServerErrors(null);
    setFormError(null);
    try {
      await save(() => updateAcademicYear(id, values as UpdateAcademicYearDto));
      router.push("/app/academic-years");
    } catch (e: unknown) {
      const err = e as {
        message?: string;
        validationErrors?: Record<string, string[]>;
      };
      if (err.validationErrors) setServerErrors(err.validationErrors);
      else setFormError(err.message ?? "Could not update the academic year.");
    }
  };

  if (status === "error") {
    return (
      <div className="p-4">
        <ErrorState
          description={error?.message ?? "Academic year not found."}
          action={
            <button
              type="button"
              className="rounded-md border border-border px-3 py-2 text-sm"
              onClick={() => load(() => getAcademicYear(id))}
            >
              Retry
            </button>
          }
        />
      </div>
    );
  }

  if (status !== "success" || !year) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <AcademicShell
      title="Academic years"
      description={`Editing "${year.name}".`}
      requiredPermissions={["academic_years.update"]}
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
          mode="edit"
          initialValues={year}
          loading={isPending}
          serverErrors={serverErrors}
          onSubmit={handleSubmit}
          onCancel={() => router.back()}
        />
    </AcademicShell>
  );
}
