"use client";

import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { useConfirm } from "@/features/academic/hooks/useConfirm";
import { useMutation } from "@/features/academic/hooks/useMutation";
import { useAsyncList } from "@/features/academic/hooks/useAsync";
import { subjectsApi, subjectCategoriesApi } from "@/features/academic/api/subjects";
import { DataView } from "@/features/academic/components/AsyncData";
import { DataTable } from "@/features/academic/components/DataTable";
import { DynamicForm } from "@/features/academic/components/DynamicForm";
import { AcademicShell } from "@/features/academic/components/AcademicShell";
import type { FormFieldDef } from "@/features/academic/components/DynamicForm";
import type {
  CreateSubjectDto,
  SubjectCategoryResponse,
  SubjectResponse,
  UpdateSubjectDto,
} from "@/types/academic";

export default function SubjectsPage() {
  const confirm = useConfirm("Delete this subject? This cannot be undone.");
  const {
    filtered: subjects,
    error: subjectsError,
    status: subjectsStatus,
    setFilter,
    reload: reloadSubjects,
  } = useAsyncList(subjectsApi.list, {
    filter: (s, text) =>
      s.name.toLowerCase().includes(text.toLowerCase()) ||
      s.code.toLowerCase().includes(text.toLowerCase()),
  });
  const { items: categories, status: categoriesStatus } = useAsyncList(
    subjectCategoriesApi.list,
  );

  const { execute: doSave, isPending: saving } = useMutation<SubjectResponse>();
  const { execute: doDelete } = useMutation<void>();

  const [formMode, setFormMode] = useState<"idle" | "create" | "edit">("idle");
  const [editingSubject, setEditingSubject] = useState<SubjectResponse | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [serverErrors, setServerErrors] = useState<Record<string, string[]> | null>(null);

  const categoryOptions = categories.map((c) => ({ value: c.id, label: c.name }));
  const categoryName = (id: string) =>
    categories.find((c) => c.id === id)?.name ?? id;

  const subjectFields: FormFieldDef[] = [
    { name: "name", label: "Name", type: "text", required: true },
    { name: "code", label: "Code", type: "text", required: true },
    { name: "shortName", label: "Short name", type: "text" },
    {
      name: "categoryId",
      label: "Category",
      type: "select",
      required: true,
      options: categoryOptions,
    },
    { name: "displayOrder", label: "Display order", type: "number" },
    { name: "isActive", label: "Active", type: "boolean" },
    { name: "description", label: "Description", type: "textarea" },
  ];

  const handleSubmit = async (values: Partial<SubjectResponse>) => {
    setFormError(null);
    setServerErrors(null);
    try {
      if (formMode === "create") {
        await doSave(() => subjectsApi.create(values as unknown as CreateSubjectDto));
      } else if (editingSubject) {
        await doSave(() =>
          subjectsApi.update(editingSubject.id, values as unknown as UpdateSubjectDto),
        );
      }
      setFormMode("idle");
      setEditingSubject(null);
      reloadSubjects();
    } catch (e) {
      const err = e as { message?: string; validationErrors?: Record<string, string[]> };
      if (err.validationErrors) setServerErrors(err.validationErrors);
      else setFormError(err.message ?? "Could not save the subject.");
    }
  };

  const handleDelete = async (s: SubjectResponse) => {
    if (!(await confirm())) return;
    try {
      await doDelete(() => subjectsApi.delete(s.id));
      reloadSubjects();
    } catch (e) {
      setFormError((e as { message?: string })?.message ?? "Could not delete the subject.");
    }
  };

  return (
    <AcademicShell
      title="Subjects"
      description="Manage school subjects. A subject belongs to a category and can be offered per level via subject offerings."
      requiredPermissions={["subjects.read"]}
    >
      <div className="mb-4 flex items-center justify-between">
        <div className="relative w-full max-w-sm">
          <input
            type="search"
            placeholder="Filter subjects..."
            onChange={(e) => setFilter(e.target.value)}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          />
        </div>
        <Button
          variant="primary"
          onClick={() => {
            setEditingSubject(null);
            setFormMode("create");
          }}
          disabled={categoriesStatus === "loading"}
        >
          New subject
        </Button>
      </div>

      {formMode !== "idle" ? (
        <div className="mb-6">
          <DynamicForm<SubjectResponse>
            fields={subjectFields}
            initialValues={editingSubject ?? undefined}
            loading={saving}
            serverErrors={serverErrors}
            formError={formError}
            submitLabel={formMode === "create" ? "Create" : "Save changes"}
            onSubmit={handleSubmit}
            onCancel={() => {
              setFormMode("idle");
              setEditingSubject(null);
              setFormError(null);
              setServerErrors(null);
            }}
          />
        </div>
      ) : null}

      <DataView
        status={subjectsStatus}
        error={subjectsError}
        empty={<EmptyState title="No subjects found." />}
        reload={reloadSubjects}
      >
        <DataTable
          columns={[
            { header: "Name", render: (s) => s.name },
            {
              header: "Code",
              render: (s) => <code className="text-xs text-muted-foreground">{s.code}</code>,
            },
            {
              header: "Short",
              render: (s) => <span className="text-sm">{s.shortName ?? ""}</span>,
            },
            {
              header: "Category",
              render: (s) => <span className="text-sm">{categoryName(s.categoryId)}</span>,
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
          rows={subjects}
          rowKey={(s) => s.id}
          actions={(s) => (
            <div className="flex items-center justify-end gap-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setEditingSubject(s);
                  setFormMode("edit");
                }}
              >
                Edit
              </Button>
              <Button size="sm" variant="ghost" onClick={() => handleDelete(s)}>
                Delete
              </Button>
            </div>
          )}
        />
      </DataView>
    </AcademicShell>
  );
}
