import { statusLabel } from "@/features/requests/session";

export function StatusBadge({ status, label }: { status: string; label?: string }) {
  return <span className="badge status-badge" data-status={status}>{label ?? statusLabel[status] ?? status}</span>;
}
