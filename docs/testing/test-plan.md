# Rencana pengujian

Untuk smoke test publik tanpa akun, atur `PURCHASING_SMOKE_URL` ke domain deployment dan `PURCHASING_SMOKE_HOSTED=1`, lalu jalankan `npm run test:smoke`. Pengujian memverifikasi branding layar masuk dan akses tamu ke halaman privat serta ekspor CSV.

Gunakan unit runner TypeScript yang kompatibel, PostgreSQL/Supabase lokal untuk migrasi dan tes RLS, dan Playwright untuk E2E. Fixture sintetis mencakup dua departemen, dua manager, dua gudang dengan assignment berbeda, produk aktif/nonaktif, dan vendor. Jalankan tes integrasi dengan JWT pengguna biasa melalui Data API/RPC dan tes SQL transaksi menggunakan pengaturan sesi yang merepresentasikan actor. Admin database digunakan untuk fixture dan rekonsiliasi.

| Tingkat | Skenario dan hasil yang diharapkan |
|---|---|
| Unit | Zod menolak jumlah ≤0, presisi berlebih, ID dan enum invalid. Uji pembulatan PO, pajak dan diskon, status, saldo tersedia, hak akses murni, zona waktu, sanitasi CSV. |
| Auth/RLS | Anon ditolak. Employee gagal baca/edit PR orang lain lewat tabel/view/RPC/ekspor. Manager luar scope atau bukan approver ditolak. Warehouse tidak membaca harga atau stok di luar scope. Role sendiri tidak dapat diubah. Inactive dan assignment revoked memutus akses. |
| PR | Draft edit, submit kosong gagal, approve, reject/revision dengan alasan wajib, resubmit, self-approval ditolak dan satu keputusan per putaran. Approval serentak menghasilkan satu pemenang. |
| Procurement | Reservasi dari beberapa gudang, kombinasi internal/eksternal, harga quotation snapshot, vendor/quotation tidak valid ditolak, total PO deterministik, short-close melepaskan sisa. |
| Receipt/issue | PO 100 menerima 60 lalu 40, receipt 41 setelah 60 ditolak. Barang rusak tidak menambah saldo. Issue parsial memakai reservasi sendiri dan stok/ledger konsisten. Dry-run konflik tidak menulis data. |
| Transfer | Dispatch 10 menurunkan asal 10 dan menaikkan transit 10. Receipt 6 lalu 4 mengosongkan transit. Gudang tanpa izin tidak dapat post. Transfer belum dispatch dapat dibatalkan. |
| Opname | Hitungan tetap dapat diposting selama stock_version fisik sama. Perubahan fisik memicu hitung ulang. Self approval dan adjustment di bawah reserved ditolak. |
| Konkurensi | Kirim RPC dari dua koneksi dengan barrier. Uji reserve/issue bersamaan, dua receipt sisa sama dan dispatch di bawah stok terbatas. Replay payload sama menghasilkan ID sama, payload berubah dengan key yang sama gagal, dan timeout setelah commit dapat dipulihkan. Paksa error di tengah transaksi dan rekonsiliasi sebelum/sesudah. |
| E2E | Employee buat PR → Manager approve → Procurement alokasi gabungan dan PO → Warehouse receipt → issue → Employee melihat pemenuhan. Cocokkan saldo, dokumen, status, notifikasi dan audit. Tambah jalur revisi, reject, cancel, partial, dan akses tidak sah. |
| UI/performa | Tab order, focus restoration, screen-reader names, contrast, print, retry, layout 375/768/1280 px dan 200% zoom. Ukur build size, waktu query, pagination dan ekspor dengan data representatif. |

CI menjalankan lint, typecheck, unit, migration reset/integration, E2E, build, serta menyimpan hasil. Pisahkan tes cepat dari kebutuhan runtime Supabase pada environment CI. Kriteria keluar mencakup rekonsiliasi ledger/physical, reservasi dan transit, serta bukti output setiap skenario kritis. Phase 0 memverifikasi dokumen dan angka kontras rancangan. Pengujian aplikasi dan migrasi dimulai saat komponennya tersedia.
