import { NextResponse } from "next/server";
import { haalGebruiker, isBeheer } from "@/lib/auth-server";
import { haalLiveData } from "@/lib/admin-live";

export async function GET() {
  const user = await haalGebruiker();
  if (!isBeheer(user)) {
    return NextResponse.json({ fout: "Geen toegang" }, { status: 403 });
  }
  return NextResponse.json(await haalLiveData());
}
