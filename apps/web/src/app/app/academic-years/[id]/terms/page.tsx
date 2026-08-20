"use client";

import { useParams } from "next/navigation";
import { useState } from "react";

import { EmptyState } from "@/components/ui/empty-state";
import { DataView } from "@/features/academic/components/AsyncData";
import { DataTable, type Column } from "@/features/academic/components/DataTable";
import { AcademicYearTermForm } from "@/features/academic/components/AcademicYearTermForm";
import { useAsyncList } from "@/features/academic/hooks/useAsync";
import { useMutation } from "@/features/academic/hooks/useMutation";
import {
  createTerm,
  listTerms,
} from "@/features/academic/api/academic-years";
import type { TermResponse } from "@/types/academic";

export default function AcademicYearTermsPage() {
  const params = useParams<{ id: string }>();
  const academicYearId = params?.id ?? "";
  const [showForm, setShowForm] = useState(false);
  const [serverErrors, setServerErrors] = useState<Record<string, string[]> | null>(null);

  const {
    filtered: terms,
    error,
    status,
    reload,
  } = useAsyncList(() => listTerms(academicYearId), {
    filter: (term, text) =>
      term.name.toLowerCase().includes(text.toLowerCase()),
  });

  const { execute: doCreate, isPending } = useMutation<TermResponse>();

  const handleCreate = async (values: { name: string; startDate: string; endDate: string; isActive?: boolean }) => {
    setServerErrors(null);
    try {
      await doCreate(() => createTerm(academicYearId, values));
      setShowForm(false);
      reload();
    } catch (e: unknown) {
      const err = e as { validationErrors?: Record<string, string[]> };
      setServerErrors(err.validationErrors ?? null);
    }
  };

  const columns: Column<TermResponse>[] = [
    { header: "Name", render: (t) => t.name },
    { header: "Start", render: (t) => <span className="text-sm">{new Date(t.startDate).toLocaleDateString()}</span> },
    { header: "End", render: (t) => <span className="text-sm">{new Date(t.endDate).toLocaleDateString()}</span> },
    {
      header: "Status",
      render: (t) => (
        <span className="text-sm">{t.isActive ? "Active" : "Inactive"}</span>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Terms</h1>
          <p className="text-sm text-muted-foreground">
            Academic year terms and periods
          </p>
        </div>
        <button
          type="button"
          className="rounded-md border border-border px-3 py-2 text-sm"
          onClick={() => setShowForm((s) => !s)}
        >
          {showForm ? "Cancel" : "New term"}
        </button>
      </div>

      {showForm ? (
        <AcademicYearTermForm
          loading={isPending}
          serverErrors={serverErrors}
          onSubmit={handleCreate}
          onCancel={() => setShowForm(false)}
        />
      ) : null}

      <DataView
        status={status}
        error={error}
        empty={
          <EmptyState title="No terms found" description="No academic periods have been created yet." />
        }
        reload={reload}
      >
        {terms.length === 0 ? null : (
          <DataTable
            columns={columns}
            rows={terms}
            rowKey={(t) => t.id}
            empty={<EmptyState title="No terms found" />}
          />
        )}
      </DataView>
    </div>
  );
}
