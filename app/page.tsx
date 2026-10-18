import { redirect } from "next/navigation";
import { haalGebruiker } from "@/lib/auth-server";

export default async function HomePage() {
  const user = await haalGebruiker();

  if (!user) redirect("/login");

  const rol = user.app_metadata?.rol;
  if (rol === "admin" || rol === "helper") redirect("/admin");
  redirect("/speler");
}
