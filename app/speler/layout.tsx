import { createServerSupabaseClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";

export default async function SpelerLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (user.user_metadata?.rol === "admin") redirect("/admin");

  return (
    <div className="speler-shell">
      <header className="speler-header">
        <h1>📍 Plekkie z&apos;n Loatst</h1>
      </header>
      <main className="speler-content">
        {children}
      </main>
    </div>
  );
}
