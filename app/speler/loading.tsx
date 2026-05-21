export default function SpelerLaden() {
  return (
    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div className="loading-spinner">
        <div className="spinner" />
        Laden…
      </div>
    </div>
  );
}
