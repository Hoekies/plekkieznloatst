import { haalLiveData } from "@/lib/admin-live";
import AdminDashboard from "@/components/admin/AdminDashboard";

export default async function DashboardPagina() {
  const initData = await haalLiveData();
  return <AdminDashboard initData={initData} />;
}
