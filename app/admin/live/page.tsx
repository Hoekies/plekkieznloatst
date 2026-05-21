import { haalLiveData } from "@/app/api/admin/live/spelers/route";
import AdminLiveKaart from "@/components/admin/AdminLiveKaart";

export default async function LiveKaartPagina() {
  const initData = await haalLiveData();
  return <AdminLiveKaart initData={initData} />;
}
