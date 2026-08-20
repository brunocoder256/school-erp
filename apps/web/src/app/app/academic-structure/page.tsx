"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { useConfirm } from "@/features/academic/hooks/useConfirm";
import { useMutation } from "@/features/academic/hooks/useMutation";
import { useAsyncList } from "@/features/academic/hooks/useAsync";
import { sectionsApi } from "@/features/academic/api/academic-structure";
import { DynamicForm } from "@/features/academic/components/DynamicForm";
import { DataView } from "@/features/academic/components/AsyncData";
import { DataTable } from "@/features/academic/components/DataTable";
import { AcademicShell } from "@/features/academic/components/AcademicShell";
import type { FormFieldDef } from "@/features/academic/components/DynamicForm";
import type {
  CreateSectionDto,
  SectionResponse,
  UpdateSectionDto,
} from "@/types/academic";
const sectionFields: FormFieldDef[] = [
  { name: "name", label: "Name", type: "text", required: true },
  { name: "code", label: "Code", type: "text", required: true },
  { name: "displayOrder", label: "Display order", type: "number" },
  { name: "description", label: "Description", type: "textarea" },
  { name: "isActive", label: "Active", type: "boolean" },
];

export default function AcademicStructurePage() {
  const router = useRouter();
  const confirm = useConfirm("Delete this section? This cannot be undone.");
  const {
    filtered: sections,
    error,
    status,
    setFilter,
    reload,
  } = useAsyncList(sectionsApi.list, {
    filter: (s: SectionResponse, text: string) =>
      s.name.toLowerCase().includes(text.toLowerCase()) ||
      s.code.toLowerCase().includes(text.toLowerCase()),
  });

  const { execute: doDelete } = useMutation<void>();
  const { execute: doSave, isPending: saving } = useMutation<SectionResponse>();

  type FormValues = Record<string, unknown>;
  const [formMode, setFormMode] = useState<"idle" | "create" | "edit">("idle");
  const [editingSection, setEditingSection] = useState<SectionResponse | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [serverErrors, setServerErrors] = useState<Record<string, string[]> | null>(null);

  const handleDelete = async (section: SectionResponse) => {
    if (!(await confirm())) return;
    try {
      await doDelete(() => sectionsApi.delete(section.id));
      reload();
    } catch (e) {
      setFormError((e as { message?: string })?.message ?? "Could not delete the section.");
    }
  };

  const handleSubmit = async (values: Partial<SectionResponse>) => {
    setFormError(null);
    setServerErrors(null);
    try {
      if (formMode === "create") {
        await doSave(() =>
          sectionsApi.create(values as unknown as CreateSectionDto),
        );
      } else if (editingSection) {
        await doSave(() =>
          sectionsApi.update(editingSection.id, values as unknown as UpdateSectionDto),
        );
      }
      setFormMode("idle");
      setEditingSection(null);
      reload();
    } catch (e) {
      const err = e as { message?: string; validationErrors?: Record<string, string[]> };
      if (err.validationErrors) setServerErrors(err.validationErrors);
      else setFormError(err.message ?? "Could not save the section.");
    }
  };

  return (
    <AcademicShell
      title="Academic Structure"
      description="Sections define the top-level education tracks (e.g. Nursery, Lower Secondary). Each section owns levels, which own classes, which own streams."
      requiredPermissions={["academic_structure.read"]}
    >
      <div className="mb-4 flex items-center justify-between">
        <div className="relative w-full max-w-sm">
          <input
            type="search"
            placeholder="Filter sections..."
            onChange={(e) => setFilter(e.target.value)}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          />
        </div>
        <Button
          variant="primary"
          onClick={() => {
            setEditingSection(null);
            setFormMode("create");
          }}
        >
          New section
        </Button>
      </div>

      {formMode !== "idle" ? (
        <div className="mb-6">
          <DynamicForm<SectionResponse>
            fields={sectionFields}
            initialValues={editingSection ?? undefined}
            loading={saving}
            serverErrors={serverErrors}
            formError={formError}
            submitLabel={formMode === "create" ? "Create" : "Save changes"}
            onSubmit={handleSubmit}
            onCancel={() => {
              setFormMode("idle");
              setEditingSection(null);
              setFormError(null);
              setServerErrors(null);
            }}
          />
        </div>
      ) : null}

      <DataView
        status={status}
        error={error}
        empty={<EmptyState title="No sections found." />}
        reload={reload}
      >
        <DataTable
          columns={[
            { header: "Name", render: (s) => s.name },
            {
              header: "Code",
              render: (s) => <code className="text-xs text-muted-foreground">{s.code}</code>,
            },
            {
              header: "Order",
              render: (s) => <span className="text-sm">{s.displayOrder ?? ""}</span>,
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
          rows={sections}
          rowKey={(s) => s.id}
          actions={(s) => (
            <div className="flex items-center justify-end gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setEditingSection(s);
                  setFormMode("edit");
                }}
              >
                Edit
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDelete(s)}
              >
                Delete
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push(`/app/academic-structure/${s.id}`)}
              >
                Levels
              </Button>
            </div>
          )}
        />
      </DataView>
    </AcademicShell>
  );
}
