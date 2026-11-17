# Status proyek

Asisten Purchasing menyediakan panduan akun, peran, PR/OPKB, approval, pengadaan, penerimaan, stok, pembatalan dan laporan. Chat dimuat saat dibuka dan percakapan hanya disimpan dalam memori tab. Mode AI memakai endpoint server dengan sesi dan profil aktif, validasi ukuran pertanyaan, timeout dan pembatasan burst per instance. Aktivasi membutuhkan OPENAI_API_KEY di Vercel. Kunci dan panggilan provider nyata belum dapat diverifikasi karena sesi CLI Vercel tidak valid. Uji tampilan browser juga terhenti oleh alat karena URL tidak dapat diverifikasi. Dashboard kini mengirim shell, judul dan tombol utama sebelum query antrean/ringkasan selesai.

Daftar penerimaan petugas Gudang membatasi respons menjadi 26 PO (25 ditampilkan dan satu untuk mendeteksi halaman berikutnya). Tautan antrean dashboard memfilter satu PO sesuai akses gudang. Typecheck dan empat tes konfigurasi lulus. Volume kerja internal fungsi SQL dan waktu navigasi Admin pada data besar belum diukur.

Ketujuh menu operasional memiliki tampilan pemuatan yang dapat dipramuat saat tautan muncul. Fungsi Vercel dikonfigurasi di Singapura agar dekat dengan Supabase. Proxy mengarahkan tamu ke login sebelum halaman operasional mulai dikirim. Pengukuran waktu klik hingga data tampil untuk sesi Admin Procurement di laptop masih terbuka.

Rute Gudang menyediakan status loading saat navigasi dan menampilkan saldo 25 baris per halaman. Saldo dan lookup produknya dirender melalui Suspense secara terpisah dari daftar transaksi. Pengukuran kinerja dengan volume besar dan uji transaksi lintas jobdesk masih terbuka.

Laporan pergerakan menampilkan pengeluaran dan transfer terposting bagi Warehouse dan Admin Procurement, dengan paginasi 25 transaksi, filter periode WIB dan jenis, serta CSV untuk halaman aktif. Pengelolaan pengguna, transit gudang, pajak/diskon, notifikasi stok, dan laporan detail lainnya tetap mengikuti fase masing-masing.

Dashboard Warehouse menghitung PO aktif di PostgreSQL dan hanya meminta detail enam PO terbaru. Migrasi 019 menambah indeks PO aktif per gudang. Foto login memakai WebP gudang berukuran terpisah untuk desktop dan ponsel. Uji beban dashboard dengan volume representatif masih terbuka.

Konsep logo B Ledger yang dipilih pengguna memakai forest green dan menggantikan monogram A pada login, sidebar dan favicon. Master simbol tersedia di public/aryocorp-ledger.svg.

Redesign lintas workspace menerapkan login dua panel, identitas Aryocorp pada sidebar, antrean sebagai fokus dashboard, status transaksi yang lebih mudah dibedakan, dan tautan bagian pada Pengadaan serta Gudang. Akses data dan transaksi tetap memakai jalur Supabase yang tersedia.

Favicon Aryocorp memakai monogram A forest green dan tersedia dalam ukuran 16, 32, serta 48 piksel melalui konvensi metadata Next.js.

Antrean Pengadaan menampilkan tabel PR yang disetujui dan PO aktif dalam cakupan Procurement. Pencarian nama barang dan filter OPKB dipertahankan saat berpindah halaman. Perubahan memakai relasi PR–PO yang tersedia tanpa migrasi.

Dashboard Warehouse menampilkan antrean PO sesuai penugasan, sisa penerimaan, dan jumlah PO parsial. Daftar PR memakai tabel dengan pilihan pengajuan atau persetujuan bersama saat filter OPKB aktif. Kedua layar memakai sumber Supabase yang sudah tersedia tanpa migrasi.

Tahap awal redesign ERP menerapkan token forest green, Inter, Lucide, menu profil, akses notifikasi dan ringkasan dashboard dengan data Supabase. Antrean dashboard Employee, Manager dan Procurement memakai tabel. Redesign per modul transaksi, detail metrik Warehouse dan verifikasi setiap role masih terbuka.

Employee dapat membuang draft dan membatalkan pengajuan sendiri sebelum persetujuan. Status terminal dan alasan disimpan di histori melalui migrasi 018. Perubahan stok dan PR yang sudah disetujui mengikuti prosedur operasional masing-masing.

Identitas penerbit dan pemberitahuan hak cipta Aryocorp ditambahkan ke aplikasi. Domain publik menampilkan layar masuk, dan akses transaksi tetap memakai sesi serta cakupan peran.

Konfigurasi dan panduan Supabase ditampilkan di lingkungan lokal. Di Vercel, URL Konfigurasi lama dialihkan ke Dashboard dan pengunjung tanpa sesi melanjutkan ke halaman masuk.

Production mengarahkan pengunjung dari beranda ke dashboard terproteksi dan meminta login jika belum ada sesi. Layar masuk dan aktivasi memakai panel tersendiri. Konfigurasi hosting memerlukan sesi, sementara panduan lokal tetap dapat dibuka untuk penyiapan.

Latar layar autentikasi memakai foto jabat tangan dari lampiran pengguna.

Employee dapat mengajukan hingga 25 PR miliknya per halaman dari hasil filter OPKB. Migrasi 017 menggunakan fungsi transisi PR yang sama untuk pengajuan dan persetujuan bersama. Migrasi berhasil di Production, lint dan typecheck lulus, dan uji lintas akun masih ditunda.

Persetujuan beberapa PR dengan nomor OPKB yang sama tersedia di workspace melalui migrasi 016. Pilihan eksplisit dibatasi 25 PR per halaman dan seluruh transaksi dibatalkan jika ada PR yang berubah atau di luar kewenangan Manager. Model dokumen tetap satu PR per barang.

Migrasi 016 berhasil diterapkan ke Production. Lint, typecheck, dan pemeriksaan diff lulus. Uji persetujuan dengan akun Manager masih ditunda.

Halaman Konfigurasi membedakan deployment Vercel dari workspace lokal. Deployment yang terhubung menampilkan status Supabase Auth dan tautan masuk.

Bukti cetak serah terima tersedia dari detail PR yang disetujui setelah ada transaksi. Halaman cetak memakai akses dan batas 50 transaksi dari migrasi 015. Perubahan ini tidak memerlukan migrasi baru.

Typecheck, lint, dan pemeriksaan diff lulus. Uji cetak dengan data transaksi ditunda.

Migrasi 015 menambahkan riwayat hingga 50 serah terima terbaru per PR. Akses mengikuti pemeriksaan pemenuhan PR dan riwayat dibaca dari transaksi stok; transaksi lama tetap terlihat bila penerimanya belum tercatat.

Migrasi 015 diterapkan ke Production. Lint dan typecheck lulus. Verifikasi isi riwayat dengan transaksi nyata masih ditunda.

Pengeluaran stok PR di Gudang kini memiliki kolom penerima dan referensi pengiriman opsional di workspace. Migrasi 014 menyimpan keduanya dalam transaksi pengeluaran yang sama dan riwayat menggunakan RLS pergerakan stok. Status armada dari penyedia eksternal dan persetujuan satu dokumen OPKB masih terbuka.

Lint dan typecheck lulus. Migrasi 014 berhasil dijalankan di Production. Uji posting menggunakan akun Warehouse masih ditunda.

Detail PR yang disetujui menampilkan status PO aktif, vendor, gudang tujuan, jumlah diterima, siap diserahkan, dan sudah diserahkan. Migrasi 013 memakai cakupan akses pemenuhan yang sudah ada dan hanya mengembalikan data operasional. Pelacakan resi atau armada dan persetujuan bersama satu dokumen OPKB masih terbuka.

Lint dan typecheck lulus. Migrasi 013 berhasil dijalankan di Production. Uji alur dengan transaksi riil masih ditunda.

Form permintaan di workspace mendukung referensi nomor dan tanggal OPKB, satuan barang di luar katalog, dan keterangan. Detail mempertahankan tanggal kebutuhan sebagai isian terpisah. Referensi OPKB boleh berulang dan setiap PR masih memuat satu barang. Data contoh Excel tidak diimpor.

Migrasi 011 dan isian OPKB sudah aktif di Production (6596960). Daftar permintaan berhasil dibuka dengan akun Warehouse.

Perubahan berikutnya menambahkan pengisian 2–30 barang dengan nomor OPKB yang sama dan filter nomor OPKB. Migrasi 012 menyimpan seluruh batch dalam satu transaksi melalui fungsi simpan draft yang sudah menerapkan role dan kepemilikan. Persetujuan dan pemenuhan tetap per PR. Persetujuan satu dokumen dan pelacakan pengiriman masih terbuka.

Lint, typecheck dan build lulus. SQL Editor Production melaporkan migrasi 012 berhasil. Uji simpan batch lintas akun ditunda sampai pengujian alur bisnis.

Pemulihan kata sandi ditambahkan di halaman masuk. Undangan dan pemulihan menggunakan halaman pengaturan kata sandi yang sama. Pengiriman email pemulihan belum diverifikasi pada akun Production.

Login dan aktivasi mengarah ke dashboard berdasarkan peran. Dashboard Employee menampilkan PR sendiri, Manager melihat antrean keputusan, Admin Procurement melihat PR disetujui, dan Warehouse melihat penerimaan serta alokasi dalam cakupan gudangnya. Angka memakai data yang diizinkan oleh RLS.

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

Penawaran vendor, PO serta penerimaan gudang sudah ditambahkan di workspace. Pengadaan dapat membandingkan harga satuan, membuat satu PO aktif per PR, mencetaknya dan mencatat pengiriman ke gudang tujuan. Gudang yang ditugaskan dapat mencatat penerimaan penuh atau sebagian. Rekap gudang menjumlahkan penerimaan barang.

Implementasi awal mencakup satu barang per PR dan harga IDR. Nama barang bebas dapat ditautkan ke produk katalog saat PO dikirim. Saldo stok dijumlahkan dari penerimaan, pengeluaran, transfer dan koreksi opname yang disetujui. Transfer langsung memerlukan akses ke kedua gudang. Notifikasi tersedia untuk pengajuan PR dan keputusan manager baru.

Admin Procurement dapat mengalokasikan stok untuk PR yang menggunakan katalog. Warehouse dapat mengeluarkan stok secara bertahap dari alokasi gudangnya. Sistem melindungi sisa reservasi dari pengeluaran umum dan menghitung kuantitas PO dari bagian PR yang belum dialokasikan. Reservasi dilakukan sebelum PO aktif dibuat. Laporan ringkasan menampilkan filter tanggal WIB dan menyediakan CSV dengan filter serta cakupan akses yang sama.

Penerimaan PO yang dicatat setelah migrasi 010 otomatis membuat reservasi untuk PR asal. Warehouse dapat menyerahkan barang melalui alokasi tersebut. Detail PR menampilkan kuantitas yang siap diserahkan dan yang sudah diserahkan. Penerimaan historis tidak diberi reservasi retroaktif karena stoknya mungkin sudah bergerak.

Alur transit, pajak dan diskon, notifikasi gudang, serta laporan transaksi terperinci masih terbuka. Migrasi 004–010 sudah diterapkan ke Production setelah pemeriksaan urutan schema lokal. Akun Admin Procurement dan Warehouse sudah diberi peran di Production. Akses Warehouse dibatasi ke Gudang Utama. Pengujian alur bisnis ditunda sampai rangkaian modul selesai sesuai arahan.
