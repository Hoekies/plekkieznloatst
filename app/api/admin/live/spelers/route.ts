import { NextResponse } from "next/server";
import { haalGebruiker, isBeheer } from "@/lib/auth-server";
import { haalLiveData, voorHelper } from "@/lib/admin-live";

export async function GET() {
  const user = await haalGebruiker();
  if (!isBeheer(user)) {
    return NextResponse.json({ fout: "Geen toegang" }, { status: 403 });
  }
  const data = await haalLiveData();
  return NextResponse.json(user?.app_metadata?.rol === "helper" ? voorHelper(data) : data);
}
