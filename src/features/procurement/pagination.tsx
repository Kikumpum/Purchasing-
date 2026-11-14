import Link from "next/link";

export function ProcurementPagination({ page, hasNext, href }: {
  page: number; hasNext: boolean; href: (page: number) => string;
}) {
  if (page === 1 && !hasNext) return null;
  return (
    <nav className="flex gap-4" aria-label="Halaman">
      {page > 1 && <Link className="inline-link" href={href(page - 1)}>Sebelumnya</Link>}
      {hasNext && <Link className="inline-link" href={href(page + 1)}>Berikutnya</Link>}
    </nav>
  );
}
