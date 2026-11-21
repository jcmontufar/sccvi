"use client";

import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  createUserAction,
  type UserFormState,
  updateUserAction,
} from "@/modules/users/actions/user-actions";
import type { ApplicationRole } from "@/modules/auth/types";

type UserFormProps = {
  user?: {
    id: string;
    fullName: string;
    email: string;
    role: ApplicationRole;
    healthCenterId: string | null;
    guardian: { id: string } | null;
  };
  centers: { id: string; name: string }[];
  guardians: { id: string; fullName: string; community: { name: string } }[];
};

export function UserForm({ user, centers, guardians }: UserFormProps) {
  const [role, setRole] = useState<ApplicationRole>(
    user?.role ?? "HEALTH_STAFF",
  );
  const action = user ? updateUserAction.bind(null, user.id) : createUserAction;
  const [state, formAction, pending] = useActionState<UserFormState, FormData>(
    action,
    {},
  );
  return (
    <form
      action={formAction}
      className="space-y-5 rounded-xl border bg-card p-5 sm:p-6"
    >
      <label className="block text-sm font-medium" htmlFor="fullName">
        Nombre completo
        <input
          className="mt-2 h-10 w-full rounded-lg border bg-background px-3 font-normal"
          defaultValue={user?.fullName}
          id="fullName"
          maxLength={120}
          name="fullName"
          required
        />
      </label>
      <label className="block text-sm font-medium" htmlFor="email">
        Correo de acceso
        {user ? (
          <span className="mt-2 block rounded-lg border bg-muted/40 px-3 py-2 font-normal">
            {user.email}
          </span>
        ) : (
          <input
            className="mt-2 h-10 w-full rounded-lg border bg-background px-3 font-normal"
            id="email"
            name="email"
            required
            type="email"
          />
        )}
      </label>
      <label className="block text-sm font-medium" htmlFor="role">
        Rol
        <select
          className="mt-2 h-10 w-full rounded-lg border bg-background px-3 font-normal"
          id="role"
          name="role"
          onChange={(event) => setRole(event.target.value as ApplicationRole)}
          value={role}
        >
          <option value="ADMIN">Administrador</option>
          <option value="HEALTH_STAFF">Personal de salud</option>
          <option value="CENTER_MANAGER">Responsable de centro</option>
          <option value="GUARDIAN">Tutor</option>
        </select>
      </label>
      {role === "HEALTH_STAFF" || role === "CENTER_MANAGER" ? (
        <label className="block text-sm font-medium" htmlFor="healthCenterId">
          Centro de salud
          <select
            className="mt-2 h-10 w-full rounded-lg border bg-background px-3 font-normal"
            defaultValue={user?.healthCenterId ?? ""}
            id="healthCenterId"
            name="healthCenterId"
            required
          >
            <option value="">Selecciona un centro</option>
            {centers.map((center) => (
              <option key={center.id} value={center.id}>
                {center.name}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <input name="healthCenterId" type="hidden" value="" />
      )}
      {role === "GUARDIAN" ? (
        <label className="block text-sm font-medium" htmlFor="guardianId">
          Tutor existente verificado
          <select
            className="mt-2 h-10 w-full rounded-lg border bg-background px-3 font-normal"
            defaultValue={user?.guardian?.id ?? ""}
            id="guardianId"
            name="guardianId"
            required
          >
            <option value="">Selecciona un tutor</option>
            {guardians.map((guardian) => (
              <option key={guardian.id} value={guardian.id}>
                {guardian.fullName} · {guardian.community.name}
              </option>
            ))}
          </select>
          <span className="mt-2 block text-xs font-normal text-muted-foreground">
            Confirma la identidad y la relación con el niño antes de conceder
            acceso.
          </span>
        </label>
      ) : (
        <input name="guardianId" type="hidden" value="" />
      )}
      {!user ? (
        <p className="text-sm text-muted-foreground">
          Se enviará una invitación al correo indicado. SCCVI no guarda
          contraseñas.
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">
          El correo de acceso no se modifica aquí. La desactivación se realiza
          por separado.
        </p>
      )}
      {state.error ? (
        <p
          className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive"
          role="alert"
        >
          {state.error}
        </p>
      ) : null}
      <Button disabled={pending} type="submit">
        {pending ? "Guardando…" : user ? "Guardar cambios" : "Crear e invitar"}
      </Button>
    </form>
  );
}
