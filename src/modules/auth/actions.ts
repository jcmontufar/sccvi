"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { getPrisma } from "@/lib/prisma";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type LoginState = { error?: string };

const loginSchema = z.object({
  email: z.email("Ingresa un correo electrónico válido."),
  password: z.string().min(1, "Ingresa tu contraseña."),
});

export async function loginAction(
  _state: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error || !data.user) {
    return { error: "El correo electrónico o la contraseña no son válidos." };
  }

  const profile = await getPrisma().user.findUnique({
    where: { authUserId: data.user.id },
    select: { isActive: true },
  });

  if (!profile?.isActive) {
    await supabase.auth.signOut();
    return { error: "Tu cuenta no tiene acceso activo a SCCVI." };
  }

  redirect("/app");
}

export async function logoutAction() {
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();
  redirect("/iniciar-sesion");
}
