import LaadBlokjes from "@/components/shared/LaadBlokjes";

// Pagina laden: grijze blokjes in plaats van "Laden…"
export default function AdminLaden() {
  return (
    <div style={{ padding: "24px 28px" }}>
      <LaadBlokjes aantal={4} hoogte={78} />
    </div>
  );
}
