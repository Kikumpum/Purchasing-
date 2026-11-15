# Changelog

## 2026-11-15 · Riwayat serah terima PR

- Detail PR yang disetujui menampilkan transaksi serah terima terbaru dengan waktu WIB, gudang, jumlah, penerima, dan referensi pengiriman.

## 2026-11-14 · Referensi pengiriman gudang

- Pengeluaran stok PR mencatat penerima dan referensi pengiriman opsional. Riwayat pergerakan menampilkan keduanya sesuai akses gudang.

## 2026-11-14 · Pelacakan barang OPKB

- Detail PR menampilkan progres PO, penerimaan dan serah terima barang, serta tautan ke daftar barang dengan nomor OPKB yang sama.

## 2026-11-14 · Input beberapa barang OPKB

- Employee dapat menyimpan beberapa draft PR sekaligus dengan satu referensi OPKB. Daftar permintaan dapat difilter dengan nomor OPKB.
- Migrasi 012 menyimpan seluruh batch secara atomik melalui fungsi draft yang sudah tersedia.

## 2026-11-14 · Isian referensi OPKB

- Menambahkan nomor dan tanggal OPKB, satuan barang di luar katalog, serta keterangan pada draft dan detail PR. Daftar permintaan menampilkan nomor OPKB jika terisi.
- Menambahkan migrasi 011 yang menyimpan isian bersama draft melalui kontrol akses dan versi yang sudah berlaku.

## 2026-11-14 · Pemulihan kata sandi

- Menambahkan permintaan tautan pemulihan Supabase dan dukungan tautan tersebut pada halaman pengaturan kata sandi.

## 2026-11-14 · Dashboard berdasarkan jobdesk

- Menambahkan halaman pembuka sesuai peran dan mengarahkan login serta aktivasi ke dashboard.

## 2026-11-14 · Serah terima penerimaan PO

- Mereservasi barang yang baru diterima untuk PR asal dalam transaksi penerimaan.
- Menampilkan progres serah terima pada detail PR.

## 2026-11-14 · Reservasi PR dan ekspor laporan

- Menambahkan ketersediaan stok per gudang, reservasi untuk PR, pengeluaran parsial, dan penghitungan sisa untuk PO.
- Menambahkan filter periode WIB dan unduhan CSV untuk ringkasan operasional.

## 2026-11-14 · Penawaran, PO dan penerimaan

- Menambahkan perbandingan penawaran, draft PO, dokumen cetak, pencatatan pengiriman dan pembatalan.
- Menambahkan gudang tujuan, penerimaan parsial dengan batas jumlah, serta rekap barang diterima.
- Menambahkan saldo stok, pengeluaran dan transfer langsung yang dibatasi akses gudang.
- Menambahkan pengajuan hasil hitung fisik dan persetujuan penyesuaian stok.
- Menambahkan notifikasi pengajuan dan keputusan PR dalam aplikasi.
- Menambahkan ringkasan status PR dan aktivitas gudang berdasarkan akses pengguna.

## 2026-11-14 · Vendor dan antrean pengadaan

- Menambahkan pencarian, pembuatan, perubahan, dan penonaktifan vendor oleh Admin Procurement.
- Menambahkan antrean permintaan yang disetujui, diurutkan menurut tanggal kebutuhan.

## 2026-11-14 · Katalog barang

- Menambahkan katalog aktif bagi pengguna dan pengelolaan produk bagi Admin Procurement.
- Menambahkan pilihan produk pada draft PR dan snapshot SKU, nama dan satuan.

## 2026-11-14 · Alur permintaan pertama

- Menambahkan login dan aktivasi akun Supabase, draft, pengajuan, keputusan manager dan histori permintaan.
- Menambahkan migrasi dengan RLS, pembatasan mutasi melalui RPC dan kontrol versi.
- Memeriksa respons Supabase Auth dari halaman Konfigurasi.

## 2026-11-14 · Phase 1

- Menambahkan aplikasi Next.js, shell responsif, Ringkasan, Konfigurasi dan halaman 404.
- Menambahkan validasi environment Supabase, adapter server, token UI, dan template env tanpa kredensial.
- Menambahkan lint, typecheck, tes konfigurasi dan smoke test HTTP. Memverifikasi build Webpack.
- Mendokumentasikan start lokal serta impor proyek GitHub ke Vercel.

## 2026-11-14 · Phase 0

- Menyusun instruksi repositori, spesifikasi, tahapan dan status.
- Merancang arsitektur Next.js dan Supabase, ERD, skema, transaksi stok dan kontrol konkurensi.
- Memetakan role/scope, lifecycle dokumen, pemenuhan parsial, notifikasi, audit dan keamanan.
- Menyusun design system, alur layar, rencana verifikasi, dan deployment.
