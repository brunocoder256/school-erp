import { useState } from "react";

import { Alert } from "@/components/feedback/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import type { FieldErrors } from "../utils/validation";
import { getFieldError } from "../utils/validation";
import { FormInput } from "./FormInput";
import { FormSelect, type SelectOption } from "./FormSelect";

export type FormFieldType =
  | "text"
  | "number"
  | "date"
  | "boolean"
  | "select"
  | "textarea";

export interface FormFieldDef {
  name: string;
  label: string;
  type: FormFieldType;
  required?: boolean;
  options?: SelectOption[];
  placeholder?: string;
}

export interface DynamicFormProps<T extends object = Record<string, unknown>> {
  fields: FormFieldDef[];
  initialValues?: Partial<T> | null;
  loading?: boolean;
  serverErrors?: FieldErrors | null;
  formError?: string | null;
  submitLabel?: string;
  onSubmit: (values: Partial<T>) => Promise<void> | void;
  onCancel?: () => void;
}

export function DynamicForm<T extends object = Record<string, unknown>>({
  fields,
  initialValues,
  loading,
  serverErrors,
  formError,
  submitLabel = "Save",
  onSubmit,
  onCancel,
}: DynamicFormProps<T>) {
  const source = (initialValues ?? {}) as Record<string, unknown>;
  const [values, setValues] = useState<Record<string, unknown>>(() => {
    const init: Record<string, unknown> = {};
    for (const f of fields) {
      init[f.name] = source[f.name] ?? (f.type === "boolean" ? false : "");
    }
    return init;
  });
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const update = (name: string, value: unknown) => {
    setValues((v) => ({ ...v, [name]: value }));
  };

  const errors: Record<string, string> = {};
  for (const f of fields) {
    if (f.required) {
      if (f.type === "boolean" && !values[f.name]) {
        errors[f.name] = `${f.label} is required`;
      } else if (f.type !== "boolean" && !values[f.name]) {
        errors[f.name] = `${f.label} is required`;
      }
    }
  }
  const hasErrors = Object.keys(errors).length > 0;

  const fieldError = (name: string): string | undefined =>
    getFieldError(serverErrors, name) ?? errors[name];

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setTouched(
      Object.fromEntries(fields.map((f) => [f.name, true])),
    );
    if (hasErrors || loading) return;

    const cleaned: Record<string, unknown> = {};
    for (const f of fields) {
      const raw = values[f.name];
      if (f.type === "number") {
        cleaned[f.name] = raw === "" || raw === undefined || raw === null ? undefined : Number(raw);
      } else if (typeof raw === "string" && raw === "") {
        cleaned[f.name] = undefined;
      } else {
        cleaned[f.name] = raw;
      }
    }
    try {
      await onSubmit(cleaned as unknown as Partial<T>);
    } catch {
      // errors surfaced via serverErrors / formError
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <h2 className="text-lg font-semibold text-foreground">
          {submitLabel}
        </h2>
      </CardHeader>
      <CardContent>
        {formError ? (
          <Alert
            title="Save failed"
            description={formError}
            variant="danger"
            className="mb-4"
          />
        ) : null}
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {fields.map((f) => {
              const error = fieldError(f.name);
              const value = values[f.name];
              if (f.type === "select") {
                return (
                  <FormSelect
                    key={f.name}
                    label={f.label}
                    options={f.options ?? []}
                    value={String(value ?? "")}
                    onChange={(e) => update(f.name, e.target.value)}
                    error={error}
                  />
                );
              }
              if (f.type === "boolean") {
                return (
                  <label
                    key={f.name}
                    className="flex items-center gap-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={!!value}
                      onChange={(e) => update(f.name, e.target.checked)}
                      className="h-4 w-4 rounded border-border text-primary focus-visible:ring-2 focus-visible:ring-primary"
                    />
                    <span className="text-foreground">{f.label}</span>
                    {error ? (
                      <span className="text-xs text-danger">{error}</span>
                    ) : null}
                  </label>
                );
              }
              if (f.type === "textarea") {
                return (
                  <div key={f.name} className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-foreground">{f.label}</label>
                    <textarea
                      placeholder={f.placeholder}
                      value={String(value ?? "")}
                      onChange={(e) => update(f.name, e.target.value)}
                      className={cn(
                        "min-h-[80px] w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                      )}
                    />
                  </div>
                );
              }
              return (
                <FormInput
                  key={f.name}
                  label={f.label}
                  type={f.type}
                  placeholder={f.placeholder}
                  value={String(value ?? "")}
                  onChange={(e) =>
                    update(
                      f.name,
                      f.type === "number"
                        ? e.target.value
                        : e.target.value,
                    )
                  }
                  error={error}
                />
              );
            })}
          </div>
          <div className="flex items-center gap-2 pt-2">
            <Button
              type="submit"
              variant="primary"
              disabled={hasErrors || loading}
            >
              {loading ? "Saving…" : submitLabel}
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
