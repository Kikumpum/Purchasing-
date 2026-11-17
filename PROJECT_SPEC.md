# Purchasing & Procurement Management System

## Tujuan dan ruang lingkup

Sistem web satu perusahaan dengan beberapa departemen, pengguna, dan gudang. Sistem mengelola permintaan, approval, pemenuhan internal dan eksternal, vendor, pembelian, transaksi persediaan, serta pelaporan. Sasaran operasionalnya adalah saldo terkini per gudang, status pekerjaan yang dapat ditindaklanjuti, dan jejak dokumen sampai ke pergerakan stok.

| Role | Tanggung jawab |
|---|---|
| Employee | Dashboard pribadi, katalog yang diizinkan, draft PR, pengajuan dan pengajuan ulang, status serta histori milik sendiri. |
| Manager | Antrean dan histori approval, keputusan approve/reject/revision dengan catatan, serta pemantauan PR tim dalam cakupannya. |
| Admin Procurement | Pemenuhan internal/eksternal, stok lintas gudang, vendor, quotation, PO, data master, dan laporan pengadaan. |
| Warehouse | Stok dan antrean gudang yang ditugaskan, receipt, issue, transfer, stock opname, pengajuan adjustment, cetak dokumen dan histori. |

Hak akses terperinci ada di [Permission matrix](docs/security/permissions.md).

## Kebutuhan fungsional

Calon petugas Warehouse dapat mengajukan akun dari halaman masuk. Pengajuan hanya mencatat nama dan email untuk pemeriksaan pengelola. Setelah verifikasi, pengelola mengundang pengguna dan menetapkan gudang. Akun Employee, Manager, dan Admin Procurement disiapkan melalui undangan pengelola.

| Area | Kebutuhan |
|---|---|
| Identitas | Login, logout, session refresh, profil, akun aktif/nonaktif, pemulihan password, dan pengelolaan role/scope yang diaudit. |
| Dashboard | Employee melihat jumlah PR dan status serta aktivitas pribadi. Manager melihat antrean, keputusan, revisi, dan aktivitas tim. Procurement melihat PR siap diproses, PO aktif/menunggu penerimaan, nilai pembelian, vendor aktif dan aktivitas. Warehouse melihat jumlah item, stok menipis, penerimaan, issue, transfer aktif, dan aktivitas gudang. |
| Master data | Produk, SKU, kategori, UOM, gudang, vendor, departemen, dan pengguna. Pencarian, filter, sorting, pagination, validasi, status aktif. Lokasi dalam gudang dipertimbangkan jika operasi membutuhkan pelacakan bin. |
| PR dan approval | Barang, kuantitas, satuan, tujuan kebutuhan, tanggal kebutuhan, keterangan dan referensi nomor/tanggal OPKB. Draft dan revisi berlaku sampai diajukan. Simpan identitas, waktu, keputusan dan komentar serta histori transisi. Larang approval PR sendiri. |
| Pemenuhan | Tampilkan fisik, reservasi, saldo tersedia lintas gudang dan jumlah yang masih harus dibeli. Dukung pemenuhan internal, eksternal, gabungan, dan parsial pada level baris PR. |
| Vendor dan quotation | Kontak/alamat, status vendor, histori transaksi, masa berlaku, biaya tambahan, diskon dan pajak. Bandingkan basis harga dan dokumentasikan pemilihan. Pertahankan versi quotation yang sudah digunakan. |
| Purchase Order | Nomor, tanggal, vendor, PR, baris produk, harga satuan, diskon, pajak, total, ETA, tujuan gudang, catatan dan status. Simpan snapshot komersial dan catat pengiriman PO. Format cetak/PDF. |
| Goods receipt | Berdasarkan PO terkirim. Catat tanggal, barang diterima layak, rusak/ditolak, catatan dan bukti bila dikonfigurasi. Dukung receipt parsial. Posting menambah stok layak. |
| Inventory issue | Berdasarkan alokasi PR, gudang sumber, jumlah parsial, penerima, tanggal, catatan, bukti cetak. Posting mengurangi stok dan reservasi yang dipakai. |
| Transfer | Draft, pengajuan, pengiriman, penerimaan parsial, penyelesaian dan pembatalan sebelum pengiriman. Lacak barang dalam perjalanan. Asal dan tujuan memiliki kewenangan operasi masing-masing. |
| Opname dan adjustment | Sesi hitung per gudang, saldo pembanding, hasil aktual, selisih dan alasan. Ajukan, review, lalu catat adjustment atomik dengan jejak approval. |
| Notifikasi | Kotak masuk dan read/unread dengan tautan. Event PR, PO dibuat/disetujui, receipt, issue, perubahan transfer, adjustment diajukan/diputuskan. Validasi akses dokumen saat navigasi. |
| Audit | Aktor, waktu, entitas, tindakan dan perubahan relevan, termasuk autentikasi yang relevan, perubahan akun/role/master data, approval, pembatalan, dan posting stok. Histori terlindungi dari edit pengguna. |

## Laporan dan keluaran

- PR berdasarkan periode/departemen/pemohon/status. PO berdasarkan periode/vendor/gudang/status. Spending dari snapshot PO terkirim, dikelompokkan per mata uang, dengan definisi pembatalan dan periode eksplisit.
- Vendor performance dari ETA versus tanggal pemenuhan receipt, rasio diterima layak, dan volume. Tampilkan transaksi tanpa ETA terpisah dalam denominator yang dijelaskan.
- Saldo menurut gudang/produk, low stock berdasarkan batas per produk/gudang, serta ledger per periode, gudang, produk dan tipe. Laporan receipt, issue, opname/selisih, dan ringkasan operasional gudang menggunakan dokumen posted dan histori yang dapat ditelusuri.
- Filter yang berlaku per laporan mencakup periode, departemen, pengguna, vendor, gudang, produk, status dan tipe. CSV menggunakan cakupan akses dan filter yang sama dengan layar. Dokumen PR, PO dan bukti transaksi memakai layout print dengan data snapshot.
- Waktu peristiwa disimpan UTC dalam timestamptz. Tanggal kebutuhan/ETA berupa date. Batas periode memakai zona waktu operasional yang dikonfigurasi. Usulan awal Asia/Jakarta dan UI Bahasa Indonesia.

## Fondasi teknis dan mutu

Next.js App Router, React, TypeScript strict, Tailwind CSS, Zod, Supabase Auth dan PostgreSQL. PostgreSQL functions menangani transaksi bisnis dan triggers menangani histori terpilih. React Hook Form untuk form multi-baris bila diperlukan, TanStack Table untuk tabel kompleks dan Recharts untuk laporan yang membutuhkan grafik, setelah kompatibilitas diuji. Supabase Storage privat bila alur bukti diaktifkan. In-app notification dibaca dari database. Realtime/Edge Functions dipertimbangkan bila ada kebutuhan terukur.

Query dan aggregate dibatasi sesuai role, departemen atau gudang. Baca saldo langsung dari database dalam scope untuk setiap refresh. Layar operasional mendukung keyboard, tabel dapat dipilah dan difilter, dan dialog posting menampilkan dampak. Pengujian mencakup unit, integrasi DB/RLS, E2E, konkurensi dan verifikasi build.

## Rujukan pelaksanaan

[Arsitektur](docs/architecture/overview.md) · [ERD](docs/database/erd.md) · [Skema](docs/database/schema.md) · [Aturan bisnis](docs/business-rules/workflows.md) · [Status](docs/business-rules/state-transitions.md) · [Design system](DESIGN_SYSTEM.md) · [Keamanan](docs/security/security.md) · [Pengujian](docs/testing/test-plan.md) · [Deployment](docs/deployment/plan.md) · [Tahapan](IMPLEMENTATION_PLAN.md).
