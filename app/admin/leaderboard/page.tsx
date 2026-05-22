import { haalLiveData } from "@/lib/admin-live";
import AdminLeaderboard from "@/components/admin/AdminLeaderboard";

export default async function LeaderboardPagina() {
  const initData = await haalLiveData();
  return <AdminLeaderboard initData={initData} />;
}
