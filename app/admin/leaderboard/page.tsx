import { redirect } from "next/navigation";

// De stand staat nu op het dashboard, bij de spelende spelers
export default function LeaderboardPagina() {
  redirect("/admin");
}
