"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { loginAction, type LoginState } from "@/modules/auth/actions";

const initialState: LoginState = {};

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, initialState);

  return (
    <form action={action} className="space-y-5">
      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="email">
          Correo electrónico
        </label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="nombre@ejemplo.com"
          required
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="password">
          Contraseña
        </label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="Ingresa tu contraseña"
          required
        />
      </div>
      {state.error ? (
        <p
          className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive"
          role="alert"
        >
          {state.error}
        </p>
      ) : null}
      <Button className="w-full" disabled={pending} type="submit">
        {pending ? "Iniciando sesión…" : "Iniciar sesión"}
      </Button>
    </form>
  );
}
