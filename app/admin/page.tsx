import { haalLiveData } from "@/app/api/admin/live/spelers/route";
import AdminDashboard from "@/components/admin/AdminDashboard";

export default async function DashboardPagina() {
  const initData = await haalLiveData();
  return <AdminDashboard initData={initData} />;
}
