"use client";

import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { useMutation } from "@/features/academic/hooks/useMutation";
import { useAsyncList } from "@/features/academic/hooks/useAsync";
import { teachingAssignmentsApi } from "@/features/academic/api/operations";
import { DataView } from "@/features/academic/components/AsyncData";
import { DataTable } from "@/features/academic/components/DataTable";
import { AcademicShell } from "@/features/academic/components/AcademicShell";
import type { TeachingAssignmentResponse } from "@/types/academic";

export default function TeachingAssignmentsPage() {
  const {
    filtered: assignments,
    error,
    status,
    setFilter,
    reload,
  } = useAsyncList(() => teachingAssignmentsApi.list());
  const { execute: doUpdate, isPending: isUpdating } = useMutation<TeachingAssignmentResponse>();

  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const toggleActive = async (a: TeachingAssignmentResponse) => {
    setUpdatingId(a.id);
    try {
      await doUpdate(() =>
        teachingAssignmentsApi.update(a.id, { isActive: !a.isActive }),
      );
      reload();
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <AcademicShell
      title="Teaching Assignments"
      description="Assign staff to teach a subject/class/stream for an academic year."
      requiredPermissions={["teacher_assignments.read"]}
    >
      <div className="mb-4">
        <div className="relative w-full max-w-sm">
          <input
            type="search"
            placeholder="Filter assignments..."
            onChange={(e) => setFilter(e.target.value)}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          />
        </div>
      </div>

      <DataView
        status={status}
        error={error}
        empty={<EmptyState title="No teaching assignments found." />}
        reload={reload}
      >
        <DataTable
          columns={[
            { header: "Staff", render: (a) => <span className="text-sm">{a.staffId.slice(0, 8)}</span> },
            { header: "Subject", render: (a) => <span className="text-sm">{a.subjectId.slice(0, 8)}</span> },
            { header: "Class", render: (a) => <span className="text-sm">{a.academicClassId.slice(0, 8)}</span> },
            {
              header: "Stream",
              render: (a) => <span className="text-sm">{a.streamId ? a.streamId.slice(0, 8) : "-"}</span>,
            },
            {
              header: "Group",
              render: (a) => <span className="text-sm">{a.teachingGroupId ? a.teachingGroupId.slice(0, 8) : "-"}</span>,
            },
            {
              header: "Status",
              render: (a) => (
                <Badge variant={a.isActive ? "success" : "default"}>
                  {a.isActive ? "Active" : "Inactive"}
                </Badge>
              ),
            },
          ]}
          rows={assignments}
          rowKey={(a) => a.id}
          actions={(a) => (
            <Button
              size="sm"
              variant="ghost"
              disabled={isUpdating && updatingId === a.id}
              onClick={() => toggleActive(a)}
            >
              {isUpdating && updatingId === a.id ? "Toggling..." : a.isActive ? "Deactivate" : "Activate"}
            </Button>
          )}
        />
      </DataView>
    </AcademicShell>
  );
}
