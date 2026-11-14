# Status proyek

## Phase 0 · Selesai untuk ditinjau

Pada awal Phase 0, D:/Purchasing kosong dan belum menjadi repositori Git. Brief dianalisis dan keputusan awal dicatat sebagai usulan. Deliverable mencakup instruksi kerja, spesifikasi, tahapan, arsitektur, ERD, skema, akses, lifecycle, aturan bisnis, desain, keamanan, QA dan deployment.

Pemeriksaan Phase 0 meliputi tautan lokal antar dokumen, kelengkapan file, kecocokan relasi inti ERD dengan skema, konsistensi transisi/akses, dan komputasi kontras untuk pasangan token design system. Verifikasi runtime, RLS, migrasi dan browser mengikuti fase yang menghasilkan implementasinya.

## Phase 1 · Fondasi aplikasi

Fondasi Next.js App Router, TypeScript strict, Tailwind dan npm lockfile tersedia. Route Ringkasan dan Konfigurasi memakai shell responsif dan menampilkan status validasi environment yang sebenarnya. Adapter Supabase request-scoped siap digunakan oleh fase auth. Sampel environment menggunakan kunci publishable. Login dan data pengadaan masuk fase database, keamanan dan workflow.

ESLint 9 digunakan karena peer dependency plugin Next.js belum menerima ESLint 10. Skrip dev/build memakai Webpack setelah Turbopack gagal di lingkungan Windows ini. Lint, typecheck, empat tes unit, build produksi dan tiga smoke test HTTP lulus. Preview browser memverifikasi navigasi, salin template, serta lebar konfigurasi ponsel, tablet dan desktop. Panduan impor Vercel tersedia di docs/deployment/plan.md.

## Berikutnya

Alur pertama mencakup login Supabase, draft satu barang, pengajuan, keputusan manager dan histori. Data disimpan di PostgreSQL dengan RLS. Migrasi diterapkan ke purchasing-db dan aturan akses diuji pada PostgreSQL lokal. Nama barang untuk rilis awal diisi langsung. Katalog, pemenuhan dan modul persediaan masih mengikuti rencana.

Katalog pertama menambah pencarian barang dan pengelolaan SKU, nama, satuan dan status oleh Admin Procurement. Employee dapat memilih barang aktif atau mencatat barang di luar katalog. PR menyimpan snapshot barang, dan pengujian database lokal meliputi akses role, produk nonaktif, pengulangan save serta PR lama.

Admin Procurement dapat mengelola vendor serta melihat antrean PR yang disetujui menurut tanggal kebutuhan. Hak baca dan tulis vendor dibatasi oleh RLS. Akun Admin Procurement perlu ditetapkan untuk menggunakan kedua fitur di Production.

Tahap berikutnya adalah penawaran vendor dan pembuatan PO. Lihat [rencana dan keputusan terbuka](IMPLEMENTATION_PLAN.md).
