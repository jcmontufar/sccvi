"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { parseInvitationFragment } from "@/modules/auth/invite-fragment";

export function AcceptInvitationForm() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const invitationSession = useRef<Promise<boolean> | null>(null);

  useEffect(() => {
    if (invitationSession.current === null) {
      const tokens = parseInvitationFragment(window.location.hash);
      // Supabase's admin invitation uses an implicit fragment, not PKCE.
      // Strip tokens before initializing the SSR browser client.
      window.history.replaceState(
        window.history.state,
        "",
        window.location.pathname + window.location.search,
      );
      invitationSession.current = tokens
        ? createBrowserSupabaseClient()
            .auth.setSession({
              access_token: tokens.accessToken,
              refresh_token: tokens.refreshToken,
            })
            .then(
              ({ data, error: sessionError }) =>
                !sessionError && Boolean(data.session),
            )
            .catch(() => false)
        : Promise.resolve(false);
    }
    let cancelled = false;
    void invitationSession.current.then((valid) => {
      if (cancelled) return;
      if (!valid) {
        setError("La invitación no es válida o ya expiró.");
      } else {
        setReady(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function submit(formData: FormData) {
    const password = formData.get("password");
    const confirmation = formData.get("confirmation");
    if (
      typeof password !== "string" ||
      password.length < 12 ||
      password !== confirmation
    ) {
      setError("Usa al menos 12 caracteres y confirma la misma contraseña.");
      return;
    }
    setPending(true);
    setError(undefined);
    const supabase = createBrowserSupabaseClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setPending(false);
    if (updateError) {
      setError(
        "No fue posible activar la cuenta. Solicita una nueva invitación.",
      );
      return;
    }
    router.replace("/app");
    router.refresh();
  }

  if (!ready)
    return (
      <p className="text-sm text-destructive" role="alert">
        {error ?? "Verificando invitación…"}
      </p>
    );
  return (
    <form action={submit} className="space-y-4">
      <label className="block text-sm font-medium" htmlFor="password">
        Contraseña nueva
        <input
          autoComplete="new-password"
          className="mt-2 h-10 w-full rounded-lg border bg-background px-3"
          id="password"
          minLength={12}
          name="password"
          required
          type="password"
        />
      </label>
      <label className="block text-sm font-medium" htmlFor="confirmation">
        Confirmar contraseña
        <input
          autoComplete="new-password"
          className="mt-2 h-10 w-full rounded-lg border bg-background px-3"
          id="confirmation"
          minLength={12}
          name="confirmation"
          required
          type="password"
        />
      </label>
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      <Button disabled={pending} type="submit">
        {pending ? "Activando…" : "Activar cuenta"}
      </Button>
    </form>
  );
}
