import GroepenBeheer from "@/components/admin/GroepenBeheer";

export default function GroepenPagina() {
  return (
    <>
      <div className="admin-topbar">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/help/groepen.png" alt="Groepen" style={{ height: 36, borderRadius: 6 }} />
      </div>
      <div className="admin-content">
        <GroepenBeheer />
      </div>
    </>
  );
}
