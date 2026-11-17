export default function WarehouseLoading() {
  return (
    <main className="workspace-content" id="main-content" tabIndex={-1} aria-busy="true">
      <div className="page-heading"><h1>Gudang</h1></div>
      <section className="setup-panel"><p role="status">Memuat halaman Gudang…</p></section>
    </main>
  );
}
