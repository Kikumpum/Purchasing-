export function MenuLoading({ title }: { title: string }) {
  return (
    <main className="workspace-content" id="main-content" tabIndex={-1}>
      <div className="page-heading"><h1>{title}</h1></div>
      <section className="setup-panel"><p role="status">Memuat data…</p></section>
    </main>
  );
}
