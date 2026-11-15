import type { ReactNode } from "react";
import { Layers } from "lucide-react";
import { PublisherFooter } from "@/components/publisher-footer";

export function AccessShell({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <main className="access-shell" id="main-content" tabIndex={-1}>
      <section className="setup-panel access-panel" aria-labelledby="access-title">
        <div className="section-icon"><Layers size={24} aria-hidden /></div>
        <div className="page-heading"><h1 id="access-title">{title}</h1>{description && <p>{description}</p>}</div>
        {children}
        <PublisherFooter className="mt-6 border-t border-current/15 pt-4" />
      </section>
    </main>
  );
}
