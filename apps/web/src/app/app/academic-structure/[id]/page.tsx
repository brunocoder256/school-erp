"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Spinner } from "@/components/feedback/spinner";
import { useMutation } from "@/features/academic/hooks/useMutation";
import { useAsync, useAsyncList } from "@/features/academic/hooks/useAsync";
import {
  levelsApi,
  organizationsApi,
  sectionsApi,
} from "@/features/academic/api/academic-structure";
import { DataView } from "@/features/academic/components/AsyncData";
import { DataTable } from "@/features/academic/components/DataTable";
import { AcademicShell } from "@/features/academic/components/AcademicShell";
import { FormInput } from "@/features/academic/components/FormInput";
import { FormSelect } from "@/features/academic/components/FormSelect";
import { getFieldError, type FieldErrors } from "@/features/academic/utils/validation";
import type { LevelResponse, SectionResponse } from "@/types/academic";

export default function SectionDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const sectionId = params?.id ?? "";

  const {
    data: section,
    status: sectionStatus,
    error: sectionError,
    execute: loadSection,
  } = useAsync<SectionResponse>();
  const {
    filtered: levels,
    error: levelsError,
    status: levelsStatus,
    reload: reloadLevels,
  } = useAsyncList(() => levelsApi.list(sectionId));
  const { items: orgs, status: orgsStatus } = useAsyncList(organizationsApi.list);
  const { execute: doSave, isPending: saving } = useMutation<LevelResponse>();
  const { execute: doDelete } = useMutation<void>();

  const [formError, setFormError] = useState<string | null>(null);
  const [serverErrors, setServerErrors] = useState<FieldErrors | null>(null);
  const [form, setForm] = useState({
    name: "",
    code: "",
    levelNumber: "",
    organizationId: "",
    isActive: true,
  });

  useEffect(() => {
    if (sectionId) loadSection(() => sectionsApi.get(sectionId));
  }, [sectionId, loadSection]);

  if (sectionStatus !== "success" || !section) {
    if (sectionStatus === "error") {
      return (
        <div className="p-4">
          <p className="text-sm text-danger">{sectionError?.message ?? "Failed to load section."}</p>
        </div>
      );
    }
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Spinner />
      </div>
    );
  }

  const orgName = (id: string) =>
    orgs.find((o) => o.id === id)?.name ?? id;

  const orgOptions = orgs.map((o) => ({ value: o.id, label: o.name }));

  const handleChange = (name: string, value: unknown) =>
    setForm((f) => ({ ...f, [name]: value }));

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);
    setServerErrors(null);
    if (!form.name || !form.code || !form.levelNumber || !form.organizationId) return;
    try {
      await doSave(() =>
        levelsApi.create(sectionId, {
          name: form.name,
          code: form.code,
          levelNumber: Number(form.levelNumber),
          academicOrganizationId: form.organizationId,
          isActive: form.isActive,
        }),
      );
      setForm({ name: "", code: "", levelNumber: "", organizationId: "", isActive: true });
      reloadLevels();
    } catch (e) {
      const err = e as { message?: string; validationErrors?: FieldErrors };
      if (err.validationErrors) setServerErrors(err.validationErrors);
      else setFormError(err.message ?? "Could not create the level.");
    }
  };

  return (
    <AcademicShell
      title="Academic Structure"
      description={`Section: ${section.name} (${section.code}). Add levels within this section; each level owns classes and streams.`}
      requiredPermissions={["academic_structure.read"]}
    >
      <div className="mb-6">
        <form className="grid grid-cols-1 gap-3 sm:grid-cols-5 sm:items-end" onSubmit={handleSubmit}>
          <FormInput label="Name" value={form.name} onChange={(e) => handleChange("name", e.target.value)} error={getFieldError(serverErrors, "name")} />
          <FormInput label="Code" value={form.code} onChange={(e) => handleChange("code", e.target.value)} error={getFieldError(serverErrors, "code")} />
          <FormInput label="Level #" type="number" value={form.levelNumber} onChange={(e) => handleChange("levelNumber", e.target.value)} error={getFieldError(serverErrors, "levelNumber")} />
          <FormInput label="Active" type="checkbox" checked={form.isActive} onChange={(e) => handleChange("isActive", e.target.checked)} />
          <FormSelect
            label="Organization"
            options={orgOptions}
            value={form.organizationId}
            onChange={(e) => handleChange("organizationId", e.target.value)}
            disabled={orgsStatus === "loading"}
            error={getFieldError(serverErrors, "academicOrganizationId")}
          />
          <Button type="submit" variant="primary" disabled={saving || levelsStatus === "loading"}>
            {saving ? "Saving..." : "Add level"}
          </Button>
        </form>
      </div>

      {formError ? (
        <p className="mb-3 text-sm text-danger">{formError}</p>
      ) : null}

      <DataView status={levelsStatus} error={levelsError} empty={<EmptyState title="No levels yet." />} reload={reloadLevels}>
        <DataTable
          columns={[
            { header: "Name", render: (l: LevelResponse) => l.name },
            { header: "Code", render: (l) => <code className="text-xs text-muted-foreground">{l.code}</code> },
            { header: "Level #", render: (l) => <span className="text-sm">{l.levelNumber}</span> },
            { header: "Organization", render: (l) => <span className="text-sm">{orgName(l.academicOrganizationId)}</span> },
            {
              header: "Status",
              render: (l) => <Badge variant={l.isActive ? "success" : "default"}>{l.isActive ? "Active" : "Inactive"}</Badge>,
            },
          ]}
          rows={levels}
          rowKey={(l) => l.id}
          actions={(l: LevelResponse) => (
            <div className="flex items-center justify-end gap-1">
              <Button size="sm" variant="ghost" onClick={() => router.push(`/app/academic-structure/${sectionId}/levels/${l.id}`)}>Classes</Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={async () => {
                  try {
                    await doDelete(() => levelsApi.delete(sectionId, l.id));
                    reloadLevels();
                  } catch (e) {
                    setFormError((e as { message?: string })?.message ?? "Could not delete the level.");
                  }
                }}
              >
                Delete
              </Button>
            </div>
          )}
        />
      </DataView>
    </AcademicShell>
  );
}
