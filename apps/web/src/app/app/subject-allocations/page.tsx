"use client";

import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { useMutation } from "@/features/academic/hooks/useMutation";
import { useAsyncList } from "@/features/academic/hooks/useAsync";
import { subjectAllocationsApi } from "@/features/academic/api/operations";
import { DataView } from "@/features/academic/components/AsyncData";
import { DataTable } from "@/features/academic/components/DataTable";
import { AcademicShell } from "@/features/academic/components/AcademicShell";
import type { SubjectAllocationResponse } from "@/types/academic";

export default function SubjectAllocationsPage() {
  const {
    filtered: allocations,
    error,
    status,
    setFilter,
    reload,
  } = useAsyncList(() => subjectAllocationsApi.list());
  const { execute: doUpdate, isPending: updating } = useMutation<SubjectAllocationResponse>();

  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const toggleActive = async (a: SubjectAllocationResponse) => {
    setUpdatingId(a.id);
    try {
      await doUpdate(() =>
        subjectAllocationsApi.update(a.id, { isActive: !a.isActive }),
      );
      reload();
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <AcademicShell
      title="Subject Allocations"
      description="Allocations tie a subject offering to a class/stream for an academic year."
      requiredPermissions={["subject_allocations.read"]}
    >
      <div className="mb-4">
        <div className="relative w-full max-w-sm">
          <input
            type="search"
            placeholder="Filter allocations..."
            onChange={(e) => setFilter(e.target.value)}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          />
        </div>
      </div>

      <DataView
        status={status}
        error={error}
        empty={<EmptyState title="No subject allocations found." />}
        reload={reload}
      >
        <DataTable
          columns={[
            { header: "ID", render: (a) => <code className="text-xs text-muted-foreground">{a.id.slice(0, 8)}</code> },
            { header: "Academic year", render: (a) => <span className="text-sm">{a.academicYearId.slice(0, 8)}</span> },
            { header: "Class", render: (a) => <span className="text-sm">{a.academicClassId.slice(0, 8)}</span> },
            { header: "Stream", render: (a) => <span className="text-sm">{a.streamId ? a.streamId.slice(0, 8) : "-"}</span> },
            { header: "Offering", render: (a) => <span className="text-sm">{a.subjectOfferingId.slice(0, 8)}</span> },
            {
              header: "Status",
              render: (a) => (
                <Badge variant={a.isActive ? "success" : "default"}>
                  {a.isActive ? "Active" : "Inactive"}
                </Badge>
              ),
            },
          ]}
          rows={allocations}
          rowKey={(a) => a.id}
          actions={(a) => (
            <Button
              size="sm"
              variant="ghost"
              disabled={updating && updatingId === a.id}
              onClick={() => toggleActive(a)}
            >
              {updating && updatingId === a.id ? "Toggling..." : a.isActive ? "Deactivate" : "Activate"}
            </Button>
          )}
        />
      </DataView>
    </AcademicShell>
  );
}
