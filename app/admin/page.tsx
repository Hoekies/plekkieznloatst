import { haalLiveData } from "@/lib/admin-live";
import { haalGebruiker } from "@/lib/auth-server";
import AdminDashboard from "@/components/admin/AdminDashboard";

export default async function DashboardPagina() {
  const [initData, user] = await Promise.all([haalLiveData(), haalGebruiker()]);
  return <AdminDashboard initData={initData} beperkt={user?.app_metadata?.rol === "helper"} />;
}
