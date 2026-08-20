"use client";

import { useRouter } from "next/navigation";

import { useAuth } from "@/components/auth/auth-provider";
import { Alert } from "@/components/feedback/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { DataView } from "@/features/academic/components/AsyncData";
import { DataTable, type Column } from "@/features/academic/components/DataTable";
import { EntityToolbar } from "@/features/academic/components/EntityToolbar";
import { useAsyncList } from "@/features/academic/hooks/useAsync";
import { useMutation } from "@/features/academic/hooks/useMutation";
import { useConfirm } from "@/features/academic/hooks/useConfirm";
import {
  deleteAcademicYear,
  listAcademicYears,
} from "@/features/academic/api/academic-years";
import type { AcademicYearResponse } from "@/types/academic";

export default function AcademicYearsPage() {
  const router = useRouter();
  const { hasAnyPermission } = useAuth();
  const confirm = useConfirm("Are you sure you want to delete this academic year?");
  const canManage = hasAnyPermission(["academic_years.create", "academic_years.update", "academic_years.delete"]);

  const {
    filtered: years,
    error,
    status,
    setFilter,
    reload,
  } = useAsyncList(listAcademicYears, {
    filter: (year, text) => year.name.toLowerCase().includes(text.toLowerCase()),
  });

  const { execute: doDelete, isPending } = useMutation<void>();

  const handleDelete = async (year: AcademicYearResponse) => {
    if (!confirm()) return;
    try {
      await doDelete(() => deleteAcademicYear(year.id));
      reload();
    } catch {
      // error surfaced via mutation state if needed
    }
  };

  const columns: Column<AcademicYearResponse>[] = [
    {
      header: "Name",
      render: (y) => (
        <div className="flex items-center gap-2">
          <span className="font-medium text-foreground">{y.name}</span>
          {y.isActive ? (
            <Badge variant="success">Active</Badge>
          ) : (
            <Badge variant="default">Inactive</Badge>
          )}
        </div>
      ),
    },
    {
      header: "Start date",
      render: (y) => <span className="text-sm">{new Date(y.startDate).toLocaleDateString()}</span>,
    },
    {
      header: "End date",
      render: (y) => <span className="text-sm">{new Date(y.endDate).toLocaleDateString()}</span>,
    },
    {
      header: "Status",
      render: (y) => <Badge variant={y.isActive ? "success" : "warning"}>{y.isActive ? "Active" : "Inactive"}</Badge>,
    },
    {
      header: " ",
      render: () => null,
    },
  ];

  return (
    <div className="space-y-4">
      <EntityToolbar
        searchPlaceholder="Search academic years…"
        onSearch={setFilter}
        createLabel="New academic year"
        onCreate={() => canManage && router.push("/app/academic-years/new")}
        createDisabled={!hasAnyPermission(["academic_years.create"])}
      />
      {canManage && !hasAnyPermission(["academic_years.create"]) ? (
        <Alert
          title="View only"
          description="Your role can view academic years but not create or edit them."
          variant="default"
        />
      ) : null}

      <DataView
        status={status}
        error={error}
        empty={
          <EmptyState
            title="No academic years found"
            description="Academic years will appear here once created."
          />
        }
        reload={reload}
      >
        {years.length === 0 ? null : (
          <DataTable
            columns={columns}
            rows={years}
            rowKey={(y) => y.id}
            actions={(y) => (
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push(`/app/academic-years/${y.id}/edit`)}
                >
                  Edit
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(y)}
                  disabled={isPending}
                >
                  Delete
                </Button>
              </div>
            )}
          />
        )}
      </DataView>
    </div>
  );
}
