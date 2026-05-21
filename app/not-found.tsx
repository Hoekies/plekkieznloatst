import Link from "next/link";

export default function NietGevonden() {
  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      background: "var(--bg)",
      padding: 24,
      textAlign: "center",
    }}>
      <div style={{ fontSize: "3rem", marginBottom: 16 }}>🗺️</div>
      <h1 style={{ marginBottom: 8 }}>Pagina niet gevonden</h1>
      <p style={{ color: "var(--muted)", marginBottom: 28, fontSize: "0.9rem" }}>
        Deze pagina bestaat niet of is verplaatst.
      </p>
      <Link href="/" className="btn btn-primary">Terug naar begin</Link>
    </div>
  );
}
