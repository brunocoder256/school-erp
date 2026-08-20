"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Spinner } from "@/components/feedback/spinner";
import { useMutation } from "@/features/academic/hooks/useMutation";
import { useAsync, useAsyncList } from "@/features/academic/hooks/useAsync";
import { classesApi, levelsApi } from "@/features/academic/api/academic-structure";
import { DataView } from "@/features/academic/components/AsyncData";
import { DataTable } from "@/features/academic/components/DataTable";
import { DynamicForm } from "@/features/academic/components/DynamicForm";
import { AcademicShell } from "@/features/academic/components/AcademicShell";
import type { FormFieldDef } from "@/features/academic/components/DynamicForm";
import type { ClassResponse, CreateClassDto, LevelResponse } from "@/types/academic";

const classFields: FormFieldDef[] = [
  { name: "name", label: "Name", type: "text", required: true },
  { name: "code", label: "Code", type: "text", required: true },
  { name: "description", label: "Description", type: "textarea" },
  { name: "isActive", label: "Active", type: "boolean" },
];

export default function LevelDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string; levelId: string }>();
  const sectionId = params?.id ?? "";
  const levelId = params?.levelId ?? "";

  const {
    data: level,
    status: levelStatus,
    error: levelError,
    execute: loadLevel,
  } = useAsync<LevelResponse>();
  const {
    filtered: classes,
    error: classesError,
    status: classesStatus,
    reload: reloadClasses,
  } = useAsyncList(() => classesApi.list(levelId));
  const { execute: doSave, isPending: saving } = useMutation<ClassResponse>();
  const { execute: doDelete } = useMutation<void>();

  const [serverErrors, setServerErrors] = useState<Record<string, string[]> | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (levelId) loadLevel(() => levelsApi.get(sectionId, levelId));
  }, [levelId, sectionId, loadLevel]);

  const handleSubmit = async (values: Partial<CreateClassDto>) => {
    setFormError(null);
    setServerErrors(null);
    try {
      await doSave(() => classesApi.create(levelId, values as CreateClassDto));
      setServerErrors(null);
      reloadClasses();
    } catch (e) {
      const err = e as { message?: string; validationErrors?: Record<string, string[]> };
      if (err.validationErrors) setServerErrors(err.validationErrors);
      else setFormError(err.message ?? "Could not create the class.");
    }
  };

  if (levelStatus !== "success" || !level) {
    if (levelStatus === "error") {
      return (
        <div className="p-4">
          <p className="text-sm text-danger">{levelError?.message ?? "Failed to load level."}</p>
        </div>
      );
    }
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <AcademicShell
      title="Academic Structure"
      description={`Level: ${level.name} (${level.code}) — create or browse classes below.`}
      requiredPermissions={["academic_structure.read"]}
    >
      <div className="mb-6">
        <DynamicForm<CreateClassDto>
          fields={classFields}
          loading={saving}
          serverErrors={serverErrors}
          formError={formError}
          submitLabel="Add class"
          onSubmit={handleSubmit}
        />
      </div>

      <DataView
        status={classesStatus}
        error={classesError}
        empty={<EmptyState title="No classes yet." />}
        reload={reloadClasses}
      >
        <DataTable
          columns={[
            { header: "Name", render: (c: ClassResponse) => c.name },
            {
              header: "Code",
              render: (c) => <code className="text-xs text-muted-foreground">{c.code}</code>,
            },
            {
              header: "Description",
              render: (c) => <span className="text-sm">{c.description ?? ""}</span>,
            },
            {
              header: "Status",
              render: (c) => (
                <Badge variant={c.isActive ? "success" : "default"}>
                  {c.isActive ? "Active" : "Inactive"}
                </Badge>
              ),
            },
          ]}
          rows={classes}
          rowKey={(c) => c.id}
          actions={(c: ClassResponse) => (
            <div className="flex items-center justify-end gap-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={() =>
                  router.push(
                    `/app/academic-structure/${sectionId}/levels/${levelId}/classes/${c.id}`,
                  )
                }
              >
                Streams
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={async () => {
                  try {
                    await doDelete(() => classesApi.delete(levelId, c.id));
                    reloadClasses();
                  } catch (e) {
                    setFormError((e as { message?: string })?.message ?? "Could not delete the class.");
                  }
                }}
              >
                Delete
              </Button>
            </div>
          )}
        />
      </DataView>
    </AcademicShell>
  );
}
