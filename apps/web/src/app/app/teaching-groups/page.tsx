"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { useMutation } from "@/features/academic/hooks/useMutation";
import { useAsyncList } from "@/features/academic/hooks/useAsync";
import { teachingGroupsApi } from "@/features/academic/api/operations";
import { DataView } from "@/features/academic/components/AsyncData";
import { DataTable } from "@/features/academic/components/DataTable";
import { AcademicShell } from "@/features/academic/components/AcademicShell";
import type { TeachingGroupResponse } from "@/types/academic";

export default function TeachingGroupsPage() {
  const router = useRouter();
  const {
    filtered: groups,
    error,
    status,
    setFilter,
    reload,
  } = useAsyncList(() => teachingGroupsApi.list());;
  const { execute: doUpdate, isPending: isUpdating } = useMutation<TeachingGroupResponse>();
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const toggleActive = async (g: TeachingGroupResponse) => {
    setUpdatingId(g.id);
    try {
      await doUpdate(() => teachingGroupsApi.update(g.id, { isActive: !g.isActive }));
      reload();
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <AcademicShell
      title="Teaching Groups"
      description="Groups of students taught together for a subject in a class/stream."
      requiredPermissions={["teaching_groups.read"]}
    >
      <div className="mb-4">
        <div className="relative w-full max-w-sm">
          <input
            type="search"
            placeholder="Filter teaching groups..."
            onChange={(e) => setFilter(e.target.value)}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          />
        </div>
      </div>

      <DataView
        status={status}
        error={error}
        empty={<EmptyState title="No teaching groups found." />}
        reload={reload}
      >
        <DataTable
          columns={[
            { header: "Name", render: (g) => <span className="text-sm">{g.name ?? "Unnamed"}</span> },
            { header: "Subject", render: (g) => <span className="text-sm">{g.subjectId.slice(0, 8)}</span> },
            { header: "Class", render: (g) => <span className="text-sm">{g.academicClassId.slice(0, 8)}</span> },
            {
              header: "Stream",
              render: (g) => <span className="text-sm">{g.streamId ? g.streamId.slice(0, 8) : "-"}</span>,
            },
            {
              header: "Status",
              render: (g) => (
                <Badge variant={g.isActive ? "success" : "default"}>
                  {g.isActive ? "Active" : "Inactive"}
                </Badge>
              ),
            },
          ]}
          rows={groups}
          rowKey={(g) => g.id}
          actions={(g) => (
            <div className="flex items-center justify-end gap-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => router.push(`/app/teaching-groups/${g.id}/students`)}
              >
                Students
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={isUpdating && updatingId === g.id}
                onClick={() => toggleActive(g)}
              >
                {isUpdating && updatingId === g.id ? "Toggling..." : g.isActive ? "Deactivate" : "Activate"}
              </Button>
            </div>
          )}
        />
      </DataView>
    </AcademicShell>
  );
}
