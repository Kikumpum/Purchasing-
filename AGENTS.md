# Instruksi kerja repositori

1. Sebelum mengubah file, baca AGENTS.md, PROJECT_SPEC.md, PROJECT_STATUS.md dan IMPLEMENTATION_PLAN.md. Periksa kode, migrasi, instruksi yang berlaku, status Git, dan dampak lintas modul.
2. Kerjakan satu fase atau task yang dapat diuji. Selesaikan dependensi dahulu. Setelah Phase 0, tunggu persetujuan eksplisit untuk memulai Phase 1. Catat keputusan material beserta alasan dan minta kejelasan ketika keputusan tersebut mengubah kebijakan bisnis atau arsitektur.
3. Gunakan TypeScript strict, tipe eksplisit, validasi Zod pada batas input, dan komponen reusable. Pisahkan UI, akses data dan aturan bisnis. Tangani error secara konsisten. Tandai fixture sebagai data pengujian.
4. Perubahan skema melalui migrasi. Operasi stok melalui transaksi database atomik dengan locking, idempotensi, dan ledger. Lindungi dokumen posted dan histori dari edit/hapus. Koreksi dengan transaksi kompensasi yang diaudit.
5. Verifikasi sesi dan kewenangan pada server dan database. Terapkan RLS dan grant minimum. Ambil role dan scope dari sumber tepercaya. Service role hanya di server tepercaya untuk operasi yang memerlukannya. Jaga credential di luar repo dan log.
6. Ikuti DESIGN_SYSTEM.md. Sediakan aksi fungsional, label yang jelas, validasi, dan state loading, empty, error, success. Periksa keyboard, viewport kecil, dan tabel operasional.
7. Jalankan pemeriksaan yang relevan, perbaiki kegagalan dan catat hasil aktual. Fitur selesai bila UI, backend, kontrol akses, validasi, data riil, state UI dan pengujian berjalan melalui jalur normal. Uji RLS, integritas transaksi dan cakupan role bila relevan.
8. Setelah tiap task, perbarui PROJECT_STATUS.md dan CHANGELOG.md. Perbarui IMPLEMENTATION_PLAN.md serta spesifikasi terkait saat keputusan berubah. Catat file penting, keputusan, pengujian, dan pekerjaan terbuka.
9. Lindungi perubahan pengguna. Operasi destruktif membutuhkan persetujuan. Commit dilakukan atas permintaan pengguna. Gunakan migrasi dan prosedur rilis untuk lingkungan production.
