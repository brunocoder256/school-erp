"use client";

import { useParams } from "next/navigation";
import { useEffect } from "react";

import { EmptyState } from "@/components/ui/empty-state";
import { Spinner } from "@/components/feedback/spinner";
import { useAsync } from "@/features/academic/hooks/useAsync";
import { teachingGroupsApi } from "@/features/academic/api/operations";
import { DataView } from "@/features/academic/components/AsyncData";
import { DataTable } from "@/features/academic/components/DataTable";
import { AcademicShell } from "@/features/academic/components/AcademicShell";
import type {
  TeachingGroupResponse,
  TeachingGroupStudentResponse,
} from "@/types/academic";

export default function TeachingGroupStudentsPage() {
  const params = useParams<{ id: string }>();
  const groupId = params?.id ?? "";

  const {
    data: group,
    status: groupStatus,
    error: groupError,
    execute: loadGroup,
  } = useAsync<TeachingGroupResponse>();
  const {
    data: students,
    status,
    error,
    execute: reloadStudents,
  } = useAsync<TeachingGroupStudentResponse[]>();

  useEffect(() => {
    if (!groupId) return;
    void loadGroup(() => teachingGroupsApi.get(groupId));
    void reloadStudents(() => teachingGroupsApi.students(groupId));
  }, [groupId, loadGroup, reloadStudents]);

  if (groupStatus !== "success" || !group) {
    if (groupStatus === "error") {
      return (
        <div className="p-4">
          <p className="text-sm text-danger">
            {groupError?.message ?? "Failed to load group."}
          </p>
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
      title="Teaching Group Students"
      description={`Students in group "${group.name ?? "Unnamed"}" (subject ${group.subjectId.slice(0, 8)}, class ${group.academicClassId.slice(0, 8)}).`}
      requiredPermissions={["teaching_groups.read"]}
    >
      <DataView
        status={status}
        error={error}
        empty={<EmptyState title="No students in this group." />}
        reload={() => teachingGroupsApi.students(groupId)}
      >
        {students?.length === 0 ? (
          <EmptyState title="No students in this group." />
        ) : (
          <DataTable
            columns={[
              {
                header: "Name",
                render: (s: TeachingGroupStudentResponse) => (
                  <span className="text-sm">
                    {s.student.firstName} {s.student.lastName}
                  </span>
                ),
              },
              {
                header: "Admission #",
                render: (s) => (
                  <span className="text-sm">{s.student.admissionNumber ?? ""}</span>
                ),
              },
              {
                header: "Identifier",
                render: (s) => (
                  <code className="text-xs text-muted-foreground">
                    {s.student.id.slice(0, 8)}
                  </code>
                ),
              },
            ]}
            rows={students ?? []}
            rowKey={(s) => s.student.id}
          />
        )}
      </DataView>
    </AcademicShell>
  );
}
