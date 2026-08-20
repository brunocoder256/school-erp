"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Spinner } from "@/components/feedback/spinner";
import { useMutation } from "@/features/academic/hooks/useMutation";
import { useAsync, useAsyncList } from "@/features/academic/hooks/useAsync";
import { classesApi, streamsApi } from "@/features/academic/api/academic-structure";
import { DataView } from "@/features/academic/components/AsyncData";
import { DataTable } from "@/features/academic/components/DataTable";
import { DynamicForm } from "@/features/academic/components/DynamicForm";
import { AcademicShell } from "@/features/academic/components/AcademicShell";
import type { FormFieldDef } from "@/features/academic/components/DynamicForm";
import type { ClassResponse, CreateStreamDto, StreamResponse } from "@/types/academic";

const streamFields: FormFieldDef[] = [
  { name: "name", label: "Name", type: "text", required: true },
  { name: "code", label: "Code", type: "text", required: true },
  { name: "capacity", label: "Capacity", type: "number" },
  { name: "isActive", label: "Active", type: "boolean" },
];

export default function ClassDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string; levelId: string; classId: string }>();
  const sectionId = params?.id ?? "";
  const levelId = params?.levelId ?? "";
  const classId = params?.classId ?? "";

  const {
    data: cls,
    status: classStatus,
    error: classError,
    execute: loadClass,
  } = useAsync<ClassResponse>();
  const {
    filtered: streams,
    error: streamsError,
    status: streamsStatus,
    reload: reloadStreams,
  } = useAsyncList(() => streamsApi.list(classId));
  const { execute: doSave, isPending: saving } = useMutation<StreamResponse>();
  const { execute: doDelete } = useMutation<void>();

  const [serverErrors, setServerErrors] = useState<Record<string, string[]> | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (classId) loadClass(() => classesApi.get(levelId, classId));
  }, [classId, levelId, loadClass]);

  const handleSubmit = async (values: Partial<CreateStreamDto>) => {
    setFormError(null);
    setServerErrors(null);
    try {
      await doSave(() => streamsApi.create(classId, values as CreateStreamDto));
      reloadStreams();
    } catch (e) {
      const err = e as { message?: string; validationErrors?: Record<string, string[]> };
      if (err.validationErrors) setServerErrors(err.validationErrors);
      else setFormError(err.message ?? "Could not create the stream.");
    }
  };

  if (classStatus !== "success" || !cls) {
    if (classStatus === "error") {
      return (
        <div className="p-4">
          <p className="text-sm text-danger">{classError?.message ?? "Failed to load class."}</p>
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
      description={`Class: ${cls.name} (${cls.code}) — streams branch out from here.`}
      requiredPermissions={["academic_structure.read"]}
    >
      <div className="mb-6">
        <DynamicForm<CreateStreamDto>
          fields={streamFields}
          loading={saving}
          serverErrors={serverErrors}
          formError={formError}
          submitLabel="Add stream"
          onSubmit={handleSubmit}
        />
      </div>

      <DataView
        status={streamsStatus}
        error={streamsError}
        empty={<EmptyState title="No streams yet." />}
        reload={reloadStreams}
      >
        <DataTable
          columns={[
            { header: "Name", render: (s: StreamResponse) => s.name },
            {
              header: "Code",
              render: (s) => <code className="text-xs text-muted-foreground">{s.code}</code>,
            },
            {
              header: "Capacity",
              render: (s) => <span className="text-sm">{s.capacity ?? ""}</span>,
            },
            {
              header: "Status",
              render: (s) => (
                <Badge variant={s.isActive ? "success" : "default"}>
                  {s.isActive ? "Active" : "Inactive"}
                </Badge>
              ),
            },
          ]}
          rows={streams}
          rowKey={(s) => s.id}
          actions={(s: StreamResponse) => (
            <div className="flex items-center justify-end gap-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={async () => {
                  try {
                    await doDelete(() => streamsApi.delete(classId, s.id));
                    reloadStreams();
                  } catch (e) {
                    setFormError((e as { message?: string })?.message ?? "Could not delete the stream.");
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
