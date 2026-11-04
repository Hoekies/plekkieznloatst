import { haalLiveData, voorHelper } from "@/lib/admin-live";
import { haalGebruiker } from "@/lib/auth-server";
import AdminDashboard from "@/components/admin/AdminDashboard";
import { createAdminClient } from "@/lib/supabase-admin";
import { ruimOudeGegevensOp } from "@/lib/oude-gegevens";

export default async function DashboardPagina() {
  const [initData, user] = await Promise.all([haalLiveData(), haalGebruiker()]);
  const helper = user?.app_metadata?.rol === "helper";
  // 🔒 Oude gelopen routes opruimen (hoogstens eens per 6 uur)
  if (!helper) await ruimOudeGegevensOp(createAdminClient());
  return <AdminDashboard initData={helper ? voorHelper(initData) : initData} beperkt={helper} />;
}
