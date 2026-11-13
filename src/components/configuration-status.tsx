import { CheckCircle, Circle, WarningCircle } from "@phosphor-icons/react/dist/ssr";
import type { readSupabaseConfig } from "@/lib/supabase/config";

type ConfigurationFields = ReturnType<typeof readSupabaseConfig>["fields"];

export function ConfigurationStatus({ fields }: { fields: ConfigurationFields }) {
  return (
    <dl className="checklist">
      <ConfigurationRow label="URL proyek" status={fields.url} />
      <ConfigurationRow label="Kunci publik" status={fields.key} />
    </dl>
  );
}

function ConfigurationRow({
  label,
  status,
}: {
  label: string;
  status: ConfigurationFields[keyof ConfigurationFields];
}) {
  const Icon = { valid: CheckCircle, invalid: WarningCircle, missing: Circle }[status];
  const text = { valid: "Format valid", invalid: "Format salah", missing: "Belum diisi" }[status];

  return (
    <div className="checklist-row">
      <dt>{label}</dt>
      <dd data-status={status}><Icon size={16} aria-hidden /> {text}</dd>
    </div>
  );
}
