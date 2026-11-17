import type { ReactNode } from "react";
import { PublisherFooter } from "@/components/publisher-footer";

export function AccessShell({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <main className="access-shell" id="main-content" tabIndex={-1}>
      <div className="access-photo" aria-hidden="true" />
      <section className="access-panel" aria-labelledby="access-title">
        <div className="access-wordmark"><span className="brand-mark" aria-hidden="true">A</span> Aryocorp</div>
        <div className="page-heading"><h1 id="access-title">{title}</h1>{description && <p>{description}</p>}</div>
        {children}
        <PublisherFooter className="mt-6 border-t border-current/15 pt-4" />
      </section>
    </main>
  );
}
