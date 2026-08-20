"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Spinner } from "@/components/feedback/spinner";
import { useAsync } from "@/features/academic/hooks/useAsync";
import { useAsyncList } from "@/features/academic/hooks/useAsync";
import { studentsApi } from "@/features/academic/api/students";
import { studentSubjectsApi } from "@/features/academic/api/operations";
import { DataView } from "@/features/academic/components/AsyncData";
import { DataTable } from "@/features/academic/components/DataTable";
import { AcademicShell } from "@/features/academic/components/AcademicShell";
import type { EnrollmentResponse, StudentResponse, StudentSubjectResponse } from "@/types/academic";
import { formatDate } from "@/features/academic/utils/formatters";

export default function StudentAcademicPage() {
  const params = useParams<{ id: string }>();
  const studentId = params?.id ?? "";

  const {
    data: student,
    status: studentStatus,
    error: studentError,
    execute: loadStudent,
  } = useAsync<StudentResponse>();
  const {
    filtered: enrollments,
    error: enrollmentsError,
    status: enrollmentsStatus,
    reload: reloadEnrollments,
  } = useAsyncList(() => studentsApi.enrollments(studentId));

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [subjects, setSubjects] = useState<StudentSubjectResponse[]>([]);
  const [subjectsStatus, setSubjectsStatus] = useState<"idle" | "loading">("idle");
  const [subjectsError, setSubjectsError] = useState<Error | null>(null);

  useEffect(() => {
    if (studentId) loadStudent(() => studentsApi.get(studentId));
  }, [studentId, loadStudent]);

  const loadSubjects = async (enrollmentId: string) => {
    if (expandedId === enrollmentId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(enrollmentId);
    setSubjectsStatus("loading");
    setSubjectsError(null);
    try {
      const data = await studentSubjectsApi.listByEnrollment(enrollmentId);
      setSubjects(data);
    } catch (e) {
      setSubjectsError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setSubjectsStatus("idle");
    }
  };

  if (studentStatus !== "success" || !student) {
    if (studentStatus === "error") {
      return (
        <div className="p-4">
          <p className="text-sm text-danger">{studentError?.message ?? "Failed to load student."}</p>
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
      title="Student academic record"
      description={`Academic context for ${student.firstName}${student.middleName ? ` ${student.middleName}` : ""} ${student.lastName}.`}
      requiredPermissions={["students.read"]}
    >
      <div className="mb-4 rounded-lg border border-border bg-card p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-lg font-semibold text-foreground">
              {student.firstName} {student.lastName}
            </div>
            <div className="text-sm text-muted-foreground">
              Admission #{student.admissionNumber} · {student.gender ?? "—"} · born {formatDate(student.dateOfBirth)}
            </div>
          </div>
          <Badge variant={student.status === "ACTIVE" ? "success" : "default"}>
            {student.status ?? "Inactive"}
          </Badge>
        </div>
      </div>

      <h2 className="mb-2 text-md font-semibold text-foreground">Enrollments</h2>
      <DataView
        status={enrollmentsStatus}
        error={enrollmentsError}
        empty={<EmptyState title="No enrollments found." />}
        reload={reloadEnrollments}
      >
        <DataTable
          columns={[
            { header: "ID", render: (e) => <code className="text-xs text-muted-foreground">{e.id.slice(0, 8)}</code> },
            { header: "Class", render: (e) => <span className="text-sm">{e.academicClassId.slice(0, 8)}</span> },
            { header: "Stream", render: (e) => <span className="text-sm">{e.streamId ? e.streamId.slice(0, 8) : "—"}</span> },
            { header: "Enrolled", render: (e) => <span className="text-sm">{formatDate(e.enrollmentDate)}</span> },
            {
              header: "Status",
              render: (e) => (
                <Badge variant={e.status === "ACTIVE" ? "success" : "default"}>
                  {e.status ?? "—"}
                </Badge>
              ),
            },
          ]}
          rows={enrollments}
          rowKey={(e) => e.id}
          actions={(e: EnrollmentResponse) => (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => loadSubjects(e.id)}
            >
              {expandedId === e.id ? "Hide subjects" : "Show subjects"}
            </Button>
          )}
        />
      </DataView>

      {expandedId ? (
        <div className="mt-6">
          <h3 className="mb-2 text-sm font-semibold text-foreground">Subjects for this enrollment</h3>
          {subjectsStatus === "loading" ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Spinner /> Loading subjects...
            </div>
          ) : subjectsError ? (
            <p className="text-sm text-danger">{subjectsError.message}</p>
          ) : subjects.length === 0 ? (
            <EmptyState title="No subjects enrolled." />
          ) : (
            <DataTable
              columns={[
                { header: "Subject", render: (s: StudentSubjectResponse) => <span className="text-sm">{s.subjectId.slice(0, 8)}</span> },
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
              empty={<EmptyState title="No subjects enrolled." />}
            />
          )}
        </div>
      ) : null}
    </AcademicShell>
  );
}
