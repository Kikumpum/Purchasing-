export function SectionLinks({ links }: { links: ReadonlyArray<readonly [id: string, label: string]> }) {
  return (
    <nav className="section-links print:hidden" aria-label="Bagian halaman">
      {links.map(([id, label]) => <a key={id} href={`#${id}`}>{label}</a>)}
    </nav>
  );
}
