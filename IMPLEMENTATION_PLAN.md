# Rencana implementasi

| Fase | Dependensi | Cakupan dan kriteria keluar |
|---|---|---|
| 0 · Discovery | Brief dan workspace | Spesifikasi, arsitektur, ERD, aturan, akses, desain, uji, risiko dan rilis terdokumentasi. Tinjau keputusan material bersama pemilik proses. |
| 1 · Application foundation | Persetujuan Phase 0 | Inisialisasi Git dan Next.js App Router, React, TS strict, Tailwind, ESLint, lockfile, env validation dan .env.example. Siapkan adapter Supabase request-scoped, shell, tokens dan komponen dasar, struktur fitur, skrip check. Verifikasi start lokal, pesan konfigurasi, typecheck, lint, smoke test dan build. |
| 2 · Database foundation | 1 dan keputusan model | Migrasi organisasional, master, procurement, inventory dan sistem. Baseline deny by default sejak tabel diperkenalkan. Seed sintetis lokal, generated types dan reset migrasi yang berhasil. |
| 3 · Security foundation | 2 dan keputusan delegasi | Auth, password recovery, profil/status, provisioning, assignment, RLS, grants dan guard. Jalankan tes semua role dan bypass langsung ke API/RPC. |
| 4 · Master data | 3 | Users, departemen, produk, kategori, UOM, gudang dan vendor. CRUD yang diizinkan, deactivate, query terindeks, pagination dan audit. |
| 5 · Purchasing | 4 dan cakupan approval | Draft, edit/revisi, submit, keputusan, histori dan notifikasi. Verifikasi batas kepemilikan, assignment, state dan concurrency approval. |
| 6 · Procurement | 4–5 dan keputusan pembelian | Availability, reservasi dan alokasi, quotations/comparison, vendor selection, PO serta laporan procurement. Bangun kontrak saldo/ledger dan primitive locking lebih awal untuk reservasi. Tes race alokasi dan PO. |
| 7 · Inventory | 6 dan persetujuan aturan stok | Posting ledger/balance, receipt, issue, transfer, opname, adjustment, reversal yang disetujui dan rekonsiliasi. Uji paralel, rollback, replay dan round trip. |
| 8 · Reporting dan sistem | 5–7 | Dashboard role, laporan/CSV, notifikasi lintas modul, audit viewer, cetak PR/PO/bukti. Cocokkan angka ke baris sumber dan uji kebocoran ekspor. |
| 9 · QA | 1–8 | Regression suite, RLS, E2E, load, aksesibilitas, responsive, build dan perbaikan sebelum staging sign-off. |
| 10 · Deployment preparation | 9 | Env production, jalur migrasi, pemulihan backup, permission provisioning, observability, runbook dan release review. |

## Keputusan yang perlu ditinjau

Contoh OPKB memakai satu nomor untuk beberapa barang. Referensi nomor dapat diulang pada PR satu barang yang sudah tersedia. Untuk dukungan satu dokumen dengan beberapa barang dan pelacakan pengiriman, tinjau keterkaitan approval, penawaran, PO, penerimaan dan alokasi pada level baris. Contoh pengiriman mencantumkan PT, vendor, keterangan, kebutuhan dan referensi OPKB. Cakupan PT dan lokasi perlu dipetakan terhadap departemen, tujuan kirim dan akses pengguna sebelum perubahan skema pengiriman.

| Keputusan/usulan Phase 0 | Alasan dan batas waktu |
|---|---|
| Satu perusahaan, beberapa departemen dan gudang. Manager ditugaskan per departemen. Approval satu tingkat dengan satu approver tercatat saat submit. | Model akses dan histori bergantung pada kebijakan ini. Konfirmasi cakupan tim, alih tugas dan pengganti sebelum Phase 2–3. |
| Provisioning identitas/role lewat operasional tepercaya. Delegasi terbatas bagi admin procurement yang diberi kemampuan eksplisit. | Empat role bisnis tetap. Konfirmasi pemilik bootstrap dan hak delegasi sebelum Phase 3. |
| Usulan PO disetujui procurement secara eksplisit, tanpa pemisahan pembuat/penyetuju di baseline. | Jika ada limit nilai, approver lain, approval ganda, atau aturan pajak resmi, kebijakan harus ditetapkan sebelum Phase 6. |
| UOM stok tunggal per produk, kuantitas sampai enam desimal, tanpa lot/serial atau valuasi akuntansi di baseline. | Konfirmasi sebelum Phase 2 karena konversi, batch, dan costing mengubah ledger dan constraint. |
| Receipt rusak tidak masuk stok layak dan tetap menyisakan kewajiban vendor. | Konfirmasi alur retur, toleransi overreceipt dan penalti vendor sebelum Phase 6–7. |
| Adjustment disetujui procurement dengan pelaku berbeda. Stok berubah selama opname memaksa hitung ulang pada item terdampak. | Membatasi risiko koreksi stale. Konfirmasi pemilik approval dan proses selisih transfer sebelum Phase 7. |
| UI Bahasa Indonesia, zona operasional Asia/Jakarta, mata uang default usulan IDR. | Format dan default dapat dikonfigurasi. Pembelian lintas mata uang dilaporkan per mata uang sampai aturan kurs disepakati. |

## Risiko implementasi

- Oversell, overreceive, dan duplicate posting. Gunakan row locks, constraint, operation keys, dan rekonsiliasi ledger.
- Kebocoran lintas scope lewat view/ekspor/RPC. Uji jalur PostgREST dan Supabase user session dengan fixture lintas departemen/gudang.
- Transaksi tersangkut saat stok dikoreksi atau assignment berubah. Tampilkan konflik per dokumen, sediakan alih tugas yang diaudit, dan simpan transaksi kompensasi.
- Drift jumlah/pajak/rounding atau perubahan katalog historis. Snapshot transaksi, tipe decimal, formulasi per baris yang diuji, dan konfirmasi aturan finance.
- Volume ledger dan laporan. Ukur query pada data representatif, tinjau indeks dan stabilitas pagination sebelum materialisasi.
- Kredensial/proyek Supabase dan runtime lokal. Phase 1 menggunakan konfigurasi eksplisit. Staging dan production memakai proyek terpisah dengan akses operasional yang ditetapkan.
