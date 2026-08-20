"use client";

import { useParams } from "next/navigation";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { useConfirm } from "@/features/academic/hooks/useConfirm";
import { useMutation } from "@/features/academic/hooks/useMutation";
import { useAsyncList } from "@/features/academic/hooks/useAsync";
import {
  createTerm,
  deleteTerm,
  listTerms,
  updateTerm,
} from "@/features/academic/api/academic-years";
import { DataView } from "@/features/academic/components/AsyncData";
import { DataTable } from "@/features/academic/components/DataTable";
import { DynamicForm } from "@/features/academic/components/DynamicForm";
import { AcademicShell } from "@/features/academic/components/AcademicShell";
import type { FormFieldDef } from "@/features/academic/components/DynamicForm";
import type { CreateTermDto, TermResponse } from "@/types/academic";

const termFields: FormFieldDef[] = [
  { name: "name", label: "Name", type: "text", required: true },
  { name: "startDate", label: "Start date", type: "date", required: true },
  { name: "endDate", label: "End date", type: "date", required: true },
  { name: "isActive", label: "Active", type: "boolean" },
];

export default function AcademicYearTermsPage() {
  const params = useParams<{ id: string }>();
  const aid = params?.id ?? "";

  const confirm = useConfirm("Delete this term? This cannot be undone.");
  const {
    filtered: terms,
    error,
    status,
    reload,
  } = useAsyncList(() => listTerms(aid));
  const { execute: doSave, isPending: saving } = useMutation<TermResponse>();
  const { execute: doDelete } = useMutation<void>();

  const [formMode, setFormMode] = useState<"idle" | "create" | "edit">("idle");
  const [editingTerm, setEditingTerm] = useState<TermResponse | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [serverErrors, setServerErrors] = useState<Record<string, string[]> | null>(null);

  const handleSubmit = async (values: Partial<CreateTermDto>) => {
    setFormError(null);
    setServerErrors(null);
    try {
      if (formMode === "create") {
        await doSave(() => createTerm(aid, values as CreateTermDto));
      } else if (editingTerm) {
        await doSave(() => updateTerm(aid, editingTerm.id, values as CreateTermDto));
      }
      setFormMode("idle");
      setEditingTerm(null);
      reload();
    } catch (e) {
      const err = e as { message?: string; validationErrors?: Record<string, string[]> };
      if (err.validationErrors) setServerErrors(err.validationErrors);
      else setFormError(err.message ?? "Could not save the term.");
    }
  };

  const handleDelete = async (t: TermResponse) => {
    if (!(await confirm())) return;
    try {
      await doDelete(() => deleteTerm(aid, t.id));
      reload();
    } catch (e) {
      setFormError((e as { message?: string })?.message ?? "Could not delete the term.");
    }
  };

  const startEdit = (t: TermResponse) => {
    setEditingTerm(t);
    setFormMode("edit");
    setFormError(null);
    setServerErrors(null);
  };
  const startCreate = () => {
    setEditingTerm(null);
    setFormMode("create");
    setFormError(null);
    setServerErrors(null);
  };

  return (
    <AcademicShell
      title="Academic years"
      description="Terms and academic periods for this year."
      requiredPermissions={["terms.read"]}
    >
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Terms
        </h1>
        <Button variant="primary" onClick={startCreate}>
          New term
        </Button>
      </div>

      {formMode !== "idle" ? (
        <div className="mb-6">
          <DynamicForm<CreateTermDto>
            fields={termFields}
            initialValues={editingTerm ?? undefined}
            loading={saving}
            serverErrors={serverErrors}
            formError={formError}
            submitLabel={formMode === "create" ? "Create" : "Save changes"}
            onSubmit={handleSubmit}
            onCancel={() => {
              setFormMode("idle");
              setEditingTerm(null);
              setFormError(null);
              setServerErrors(null);
            }}
          />
        </div>
      ) : null}

      {formError ? (
        <p className="mb-3 text-sm text-danger">{formError}</p>
      ) : null}

      <DataView
        status={status}
        error={error}
        empty={<EmptyState title="No terms found." />}
        reload={reload}
      >
        <DataTable
          columns={[
            { header: "Name", render: (t: TermResponse) => t.name },
            {
              header: "Start",
              render: (t) => (
                <span className="text-sm">{new Date(t.startDate).toLocaleDateString()}</span>
              ),
            },
            {
              header: "End",
              render: (t) => (
                <span className="text-sm">{new Date(t.endDate).toLocaleDateString()}</span>
              ),
            },
            {
              header: "Status",
              render: (t) => (
                <Badge variant={t.isActive ? "success" : "default"}>
                  {t.isActive ? "Active" : "Inactive"}
                </Badge>
              ),
            },
          ]}
          rows={terms}
          rowKey={(t) => t.id}
          actions={(t: TermResponse) => (
            <div className="flex items-center justify-end gap-1">
              <Button size="sm" variant="ghost" onClick={() => startEdit(t)}>
                Edit
              </Button>
              <Button size="sm" variant="ghost" onClick={() => handleDelete(t)}>
                Delete
              </Button>
            </div>
          )}
        />
      </DataView>
    </AcademicShell>
  );
}
