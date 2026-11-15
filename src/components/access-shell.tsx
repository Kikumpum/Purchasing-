import type { ReactNode } from "react";
import { Stack } from "@phosphor-icons/react/dist/ssr";

export function AccessShell({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <main className="access-shell" id="main-content" tabIndex={-1}>
      <section className="setup-panel access-panel" aria-labelledby="access-title">
        <div className="section-icon"><Stack size={24} aria-hidden /></div>
        <div className="page-heading"><h1 id="access-title">{title}</h1>{description && <p>{description}</p>}</div>
        {children}
      </section>
    </main>
  );
}
