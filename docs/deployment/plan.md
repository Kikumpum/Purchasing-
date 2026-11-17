# Rencana deployment

- Phase 1 menambahkan .env.example, validasi konfigurasi, instruksi start dan pesan konfigurasi. Gunakan NEXT_PUBLIC_SUPABASE_URL serta key publishable atau anon sesuai SDK. SUPABASE_SERVICE_ROLE_KEY khusus server hanya bila provisioning memerlukannya.
- Gunakan Supabase lokal untuk development dan testing, proyek staging terpisah, serta production setelah persetujuan rollout. Tetapkan pemilik environment, role operator, allowlist callback dan konfigurasi recovery.
- Jalankan migrasi dari CI atau prosedur operasional dengan kredensial tersendiri. Validasi schema pada database kosong dan upgrade dari versi yang dirilis. Gunakan migrasi kompatibel sebelum pergantian versi, dan sediakan prosedur rollback aplikasi atau forward fix database.
- Definisikan baseline data awal, identitas, assignment, SKU, gudang, opening balance yang diposting dan rekonsiliasi. Import menggunakan job berizin dengan referensi sumber unik.
- Tetapkan retensi backup dan SLO dengan pemilik layanan. Uji restore staging dan rekonsiliasi saldo. Pantau error Auth/RPC, latency query, backlog transaksi, perbedaan ledger dan tingkat kegagalan ekspor. Lindungi informasi privat di telemetry.
- Gate rilis mencakup hasil CI, uji akses lintas scope, sign-off transaksi nyata di staging, prosedur backup/restore, konfirmasi aturan finance dan koreksi stok, serta data awal yang telah direkonsiliasi.

## Impor ke Vercel

1. Di Vercel, pilih Add New → Project, lalu impor repositori GitHub `Kikumpum/Purchasing-` dari branch `main`.
2. Gunakan preset Next.js dan root directory default. Biarkan Vercel mendeteksi install dan build dari package.json dan package-lock.json. Pilih Node.js 22.x.
3. Untuk preview fondasi ini, halaman Ringkasan dan Konfigurasi bisa dibuka dengan env Supabase kosong. Ketika proyek Supabase tersedia, masukkan `NEXT_PUBLIC_SUPABASE_URL` dan `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` pada scope Vercel yang sesuai dan deploy ulang. Gunakan proyek staging untuk Preview dan production untuk Production.
4. Setelah fase database dan auth selesai, terapkan migrasi pada environment tujuan sebelum mengaktifkan alur yang bergantung pada database. Tambahkan callback Auth yang telah diverifikasi dan jalankan uji akses.

Lihat [panduan GitHub di Vercel](https://vercel.com/docs/git/vercel-for-github) dan [panduan Next.js di Vercel](https://vercel.com/docs/frameworks/full-stack/nextjs).

## Penyiapan akun operasional

Undang pengguna melalui Supabase Auth. Setelah akun muncul, gunakan ID Auth sebagai ID profil dan tetapkan departemen serta peran yang disetujui. Admin Procurement memakai peran `admin_procurement`. Petugas gudang memakai peran `warehouse` dan memerlukan baris penugasan di `user_warehouse_access` untuk setiap gudang yang diberikan.

Gunakan tujuan undangan Production `https://purchasing-inky.vercel.app/aktifkan`. Pemilik akun menetapkan kata sandi melalui tautan undangan. Periksa profil aktif, peran dan penugasan gudang setelah provisioning.

## Asisten AI opsional

Tambahkan OPENAI_API_KEY sebagai variabel sensitif server untuk Production di Vercel, lalu deploy ulang. OPENAI_MODEL opsional, default gpt-4.1-mini. Kunci harus berasal dari akun OpenAI API pemilik aplikasi. Jangan menambahkan awalan NEXT_PUBLIC atau memasukkan kunci ke Git.

Mode Panduan berjalan secara lokal tanpa provider. Mode Tanya AI memerlukan sesi dan profil aktif. Server hanya meneruskan pertanyaan, peran dan panduan statis ke Responses API dengan store=false. Riwayat chat dan data transaksi tidak diteruskan otomatis. Jawaban dirender sebagai teks biasa.

Batas lima permintaan per menit berlaku per akun dalam satu instance server. Untuk batas lintas instance, terapkan pembatasan terpusat dan kuota provider sebelum penggunaan luas. Uji error kunci kosong, sesi kedaluwarsa, timeout dan jawaban nyata setelah aktivasi. Dokumentasi Responses API https://developers.openai.com/api/reference/resources/responses/methods/create
