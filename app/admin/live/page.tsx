import { haalLiveData } from "@/lib/admin-live";
import AdminLiveKaart from "@/components/admin/AdminLiveKaart";

export default async function LiveKaartPagina() {
  const initData = await haalLiveData();
  return <AdminLiveKaart initData={initData} />;
}
