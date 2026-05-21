import { createClient } from "@/lib/supabase";

export type Rol = "admin" | "speler";

export async function getGebruikerRol(): Promise<Rol | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  return (user.user_metadata?.rol as Rol) ?? "speler";
}

export async function isIngelogd(): Promise<boolean> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user !== null;
}

export async function uitloggen() {
  const supabase = createClient();
  await supabase.auth.signOut();
}
