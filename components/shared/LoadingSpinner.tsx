export default function LoadingSpinner({ tekst = "Laden…" }: { tekst?: string }) {
  return (
    <div className="loading-spinner">
      <div className="spinner" />
      <span>{tekst}</span>
    </div>
  );
}
