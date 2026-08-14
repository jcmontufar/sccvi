"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import {
  type HealthCenterFormState,
  updateHealthCenterAction,
} from "@/modules/health-centers/actions/health-center-actions";

type HealthCenterFormProps = {
  healthCenter: {
    id: string;
    name: string;
    code: string | null;
    address: string | null;
    phone: string | null;
    email: string | null;
  };
};

const initialState: HealthCenterFormState = {};

export function HealthCenterForm({ healthCenter }: HealthCenterFormProps) {
  const action = updateHealthCenterAction.bind(null, healthCenter.id);
  const [state, formAction, pending] = useActionState(action, initialState);
  const fields = [
    ["name", "Nombre", healthCenter.name, true, "text"],
    ["code", "Código", healthCenter.code, false, "text"],
    ["address", "Dirección", healthCenter.address, false, "text"],
    ["phone", "Teléfono", healthCenter.phone, false, "tel"],
    ["email", "Correo electrónico", healthCenter.email, false, "email"],
  ] as const;

  return (
    <form
      action={formAction}
      className="space-y-5 rounded-xl border bg-card p-5 sm:p-6"
    >
      <div className="grid gap-5 sm:grid-cols-2">
        {fields.map(([name, label, value, required, type]) => (
          <div className={name === "address" ? "sm:col-span-2" : ""} key={name}>
            <label className="mb-2 block text-sm font-medium" htmlFor={name}>
              {label}
            </label>
            <input
              className="h-10 w-full rounded-lg border bg-background px-3 text-sm"
              defaultValue={value ?? ""}
              id={name}
              name={name}
              required={required}
              type={type}
            />
          </div>
        ))}
      </div>
      {state.error ? (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}
      <Button disabled={pending} type="submit">
        {pending ? "Guardando…" : "Guardar cambios"}
      </Button>
    </form>
  );
}
