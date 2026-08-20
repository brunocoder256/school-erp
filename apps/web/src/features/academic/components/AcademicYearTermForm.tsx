import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import type { CreateTermDto } from "@/types/academic";
import { FormInput } from "./FormInput";
import { getFieldError, type FieldErrors } from "../utils/validation";

export interface AcademicYearTermFormProps {
  loading?: boolean;
  serverErrors?: FieldErrors | null;
  onSubmit: (values: CreateTermDto) => Promise<void> | void;
  onCancel?: () => void;
}

interface FormState {
  name: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

const empty: FormState = {
  name: "",
  startDate: "",
  endDate: "",
  isActive: true,
};

export function AcademicYearTermForm({
  loading,
  serverErrors,
  onSubmit,
  onCancel,
}: AcademicYearTermFormProps) {
  const [values, setValues] = useState<FormState>(empty);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const update = (patch: Partial<FormState>) =>
    setValues((v) => ({ ...v, ...patch }));

  const errors: Record<string, string> = {};
  if (touched.name && !values.name.trim()) {
    errors.name = "Name is required";
  }
  if (touched.startDate && !values.startDate) {
    errors.startDate = "Start date is required";
  }
  if (touched.endDate && !values.endDate) {
    errors.endDate = "End date is required";
  }
  if (
    values.startDate &&
    values.endDate &&
    new Date(values.endDate) < new Date(values.startDate)
  ) {
    errors.endDate = "End date must be after the start date";
  }

  const hasErrors = Object.keys(errors).length > 0;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setTouched({ name: true, startDate: true, endDate: true, isActive: true });
    if (hasErrors || loading) return;
    try {
      await onSubmit({
        name: values.name.trim(),
        startDate: values.startDate,
        endDate: values.endDate,
        isActive: values.isActive,
      });
    } catch {
      // server validation errors surfaced via `serverErrors`
    }
  };

  return (
    <Card className={cn("w-full")}>
      <CardHeader>
        <h2 className="text-lg font-semibold text-foreground">New term</h2>
      </CardHeader>
      <CardContent>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <FormInput
            label="Name"
            placeholder="e.g. Term 1"
            value={values.name}
            onChange={(e) => update({ name: e.target.value })}
            error={getFieldError(serverErrors, "name") ?? errors.name}
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormInput
              label="Start date"
              type="date"
              value={values.startDate}
              onChange={(e) => update({ startDate: e.target.value })}
              error={getFieldError(serverErrors, "startDate") ?? errors.startDate}
            />
            <FormInput
              label="End date"
              type="date"
              value={values.endDate}
              onChange={(e) => update({ endDate: e.target.value })}
              error={getFieldError(serverErrors, "endDate") ?? errors.endDate}
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={values.isActive}
              onChange={(e) => update({ isActive: e.target.checked })}
              className="h-4 w-4 rounded border-border text-primary focus-visible:ring-2 focus-visible:ring-primary"
            />
            <span className="text-foreground">Active</span>
          </label>

          <div className="flex items-center gap-2 pt-2">
            <Button
              type="submit"
              variant="primary"
              disabled={hasErrors || loading}
            >
              {loading ? "Saving…" : "Create"}
            </Button>
            {onCancel ? (
              <Button type="button" variant="secondary" onClick={onCancel}>
                Cancel
              </Button>
            ) : null}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
