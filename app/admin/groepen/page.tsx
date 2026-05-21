import GroepenBeheer from "@/components/admin/GroepenBeheer";

export default function GroepenPagina() {
  return (
    <>
      <div className="admin-topbar">
        <h1>Groepen</h1>
      </div>
      <div className="admin-content">
        <GroepenBeheer />
      </div>
    </>
  );
}
