import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";

async function checkAdmin() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.app_metadata?.rol !== "admin") return null;
  return user;
}

export async function GET() {
  if (!await checkAdmin()) return NextResponse.json({ fout: "Geen toegang" }, { status: 403 });
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("routes")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ fout: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  if (!await checkAdmin()) return NextResponse.json({ fout: "Geen toegang" }, { status: 403 });
  const { name } = await request.json();
  if (!name?.trim()) return NextResponse.json({ fout: "Naam is verplicht" }, { status: 400 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("routes")
    .insert({ name: name.trim(), status: "concept", is_active: false })
    .select()
    .single();
  if (error) return NextResponse.json({ fout: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
