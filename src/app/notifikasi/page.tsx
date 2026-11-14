import Link from "next/link";
import { redirect } from "next/navigation";
import { WorkspaceShell } from "@/components/workspace-shell";
import { requireRequestSession, statusLabel } from "@/features/requests/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

async function readNotification(form: FormData) {
  "use server";
  const id = form.get("id");
  if (typeof id !== "string" || !/^[1-9]\d{0,17}$/.test(id)) redirect("/notifikasi?error=1");
  const supabase = await createSupabaseServerClient({ writableCookies: true });
  const { error } = await supabase.rpc("mark_request_notification_read", { p_id: id });
  redirect(error ? "/notifikasi?error=1" : "/notifikasi");
}

const date = new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" });

export default async function NotificationsPage({ searchParams }: {
  searchParams: Promise<{ error?: string; sebelum?: string }>;
}) {
  const { error, sebelum } = await searchParams;
  const { supabase, profile } = await requireRequestSession();
  if (!profile) redirect("/permintaan");
  let query = supabase.from("request_notifications")
    .select("id, request_id, status, created_at, read_at").order("id", { ascending: false }).limit(26);
  if (sebelum && /^[1-9]\d{0,17}$/.test(sebelum)) query = query.lt("id", sebelum);
  const result = await query;
  const entries = result.data?.slice(0, 25) ?? [];
  return (
    <WorkspaceShell current="notifications" canProcure={profile.role === "admin_procurement"}
      canWarehouse={profile.role === "admin_procurement" || profile.role === "warehouse"}>
      <div className="page-heading"><h1>Notifikasi</h1></div>
      {error === "1" && <p role="alert" className="copy-error">Notifikasi gagal ditandai terbaca.</p>}
      <section className="setup-panel">
        {result.error ? <p role="alert">Notifikasi gagal dimuat.</p> : !entries.length ? <p>Belum ada notifikasi pada halaman ini.</p> : (
          <ul className="module-list">{entries.map((entry) => (
            <li key={entry.id} className="justify-between flex-wrap">
              <div>
                <Link className="inline-link" href={`/permintaan/${entry.request_id}`}>{statusLabel[entry.status]} · Lihat PR</Link>
                <p><time dateTime={entry.created_at}>{date.format(new Date(entry.created_at))}</time>{!entry.read_at && " · Belum dibaca"}</p>
              </div>
              {!entry.read_at && <form action={readNotification}>
                <input type="hidden" name="id" value={entry.id} />
                <button className="button">Tandai terbaca</button>
              </form>}
            </li>
          ))}</ul>
        )}
        <nav className="flex gap-4" aria-label="Halaman notifikasi">
          {sebelum && <Link className="inline-link" href="/notifikasi">Terbaru</Link>}
          {(result.data?.length ?? 0) > 25 && <Link className="inline-link" href={`/notifikasi?sebelum=${entries.at(-1)?.id}`}>Lebih lama</Link>}
        </nav>
      </section>
    </WorkspaceShell>
  );
}
