import GroepenBeheer from "@/components/admin/GroepenBeheer";
import HelpersBeheer from "@/components/admin/HelpersBeheer";
import MenuIcoon from "@/components/admin/MenuIcoon";

export default function GroepenPagina() {
  return (
    <>
      <div className="admin-topbar">
        <span className="admin-topbar-titel"><MenuIcoon naam="spelers" />Spelers</span>
      </div>
      <div className="admin-content">
        <GroepenBeheer />
        <HelpersBeheer />
      </div>
    </>
  );
}
