# Design system · Purchasing

Rancangan untuk web enterprise responsif dengan profil Dashboard/Admin dan App/Product UI. Pengguna utama bekerja lewat antrean PR, PO dan gudang. Fokus visualnya adalah dokumen yang membutuhkan tindakan, jumlah yang masih terbuka, dan gudang penanggung jawab.

## Konsep dan referensi

Setiap antrean menempatkan dokumen dan tanggal kebutuhan di kiri, status dan kuantitas tersisa di tengah, serta gudang atau pemilik tindakan di kanan. Detail memakai ringkasan jumlah diminta, dialokasikan, diterima dan dikeluarkan sesuai konteks. Font dengan angka tabular membuat perbandingan mudah. Aksen hijau gelap menandai satu aksi utama. Perubahan status tetap terlihat setelah request selesai melalui badge dan histori.

- Linear menginspirasi filter yang dapat digunakan kembali dan antrean yang bisa ditautkan. [Linear Custom Views](https://linear.app/docs/custom-views)
- Dokumentasi Stripe menginspirasi penyajian status dokumen dan langkah selanjutnya. [Stripe Invoicing](https://docs.stripe.com/invoicing/overview)
- SAP Fiori menginspirasi pola standar daftar → detail dengan filter pada daftar dan aksi kontekstual. [SAP Fiori Floorplans](https://www.sap.com/design-system/fiori-design-web/v1-145/page-types/floorplans/when-to-use-which-floorplan)

Review konsep pada rancangan menemukan bahwa kartu statistik bisa menyembunyikan pekerjaan parsial. Tempatkan antrean sebelum ringkasan. Tampilkan sisa PO di kolom penerimaan, sisa issue di antrean PR, dan sisa transit di transfer. Ketiganya harus terlihat tanpa membuka laporan.

## Token

Palet light dengan strategi restrained. Gunakan base sebagai bidang terbesar, surface pada area kerja, dan accent terbatas pada kontrol aktif. Nilai sRGB berikut adalah referensi komputasi dan fallback. Saat implementasi, gunakan warna OKLCH yang dikonversi dari nilai ini dan uji ulang computed styles.

| Token | Hex | Penggunaan |
|---|---|---|
| bg | #F4F6F1 | Latar workspace |
| surface | #FBFCF9 | Tabel, form, panel |
| text | #202A24 | Judul dan isi |
| text-muted | #4D5D53 | Metadata dan helper |
| accent | #24543C | Aksi primer, tautan dan focus |
| on-accent | #FBFCF9 | Label primer |
| control-border | #748277 | Batas input |
| divider | #D9DFD7 | Pemisah tabel/section |
| success-bg / success-text | #E6F0E8 / #24543C | Posted, diterima, selesai |
| warning-bg / warning-text | #FBF0D9 / #68430E | Perlu tindakan, parsial |
| danger-bg / danger-text | #FCECEF / #852F36 | Ditolak, gagal atau aksi destruktif |

Kontras sRGB yang dihitung untuk pasangan rencana. Text/surface 14,38:1, muted/bg 6,42:1, on-accent/accent 8,47:1, focus/surface 8,47:1, focus/bg 8,01:1, warning 7,74:1, danger 7,48:1, success 7,47:1, control border/surface 3,92:1.

Gunakan Geist untuk huruf yang ringkas dan konsisten pada judul, form dan data. Pakai tabular-nums pada angka dan rata kanan untuk kuantitas dan uang. Ukuran dalam px sebagai target token. Display 32–40/1,15, h1 24–32/1,2, h2 22/1,25, h3 18/1,3, body-lg 18/1,5, body 16/1,5, body-sm 14/1,45 untuk metadata, caption 13/1,4, button 14/1,25 medium. Prosa panjang dibatasi sekitar 65ch.

Spacing 4, 8, 12, 16, 24, 32, 48 px. Radius 4 untuk status, 6 untuk kontrol, 8 untuk dialog/panel. Pemisah tipis pada row dan input. Shadow ringan untuk popover dan dialog dengan 0 8px 24px rgba(32,42,36,0.14). Prioritaskan slot untuk data. Gunakan identitas produk dalam bentuk wordmark teks. Foto dipakai untuk bukti transaksi bila fitur aktif. Pilih satu keluarga ikon fungsional Phosphor, 16–20 px.

## Layout dan navigasi

- Desktop memakai sidebar 232 px, top bar 56 px untuk lokasi/breadcrumb, notifikasi dan akun. Content gutter 24–32 px. Struktur halaman judul, keterangan relevan, satu aksi primer, filter, daftar/form, dan aksi kontekstual.
- Sidebar Employee berisi Ringkasan, Permintaan Saya dan Notifikasi. Manager berisi Ringkasan, Persetujuan dan Permintaan Tim. Procurement berisi Antrean PR, Vendor, Quotation, PO, Master Data dan Laporan. Warehouse berisi Stok, Penerimaan, Pengeluaran, Transfer, Opname dan Laporan. Profil/notifikasi konsisten di top bar. Menu mengikuti matrix dan capability.
- Di bawah 1024 px, sidebar menjadi drawer. Pada 768 px ke bawah, tabel menampilkan kolom inti lalu membuka detail untuk kolom tambahan. Area scroll horizontal hanya untuk tabel yang perlu mempertahankan perbandingan dan memiliki label serta fokus keyboard. Pada 375 px, filter terbuka lewat tombol dan form satu kolom. Kontrol sentuh utama memberi target minimal 44 px.
- Dashboard tiap role menempatkan antrean di awal. Employee melihat draft dan permintaan revisi. Manager melihat antrean approval. Procurement melihat PR belum dialokasikan dan PO terbuka. Warehouse melihat receipt, issue dan transfer yang bisa dikerjakan. Ringkasan singkat berisi angka yang dapat ditelusuri ke daftar dan aktivitas terbaru dari event yang sah.

## Komponen dan interaksi

| Komponen | Kontrak |
|---|---|
| Button | Primary solid, secondary outline, tertiary text, destructive pada konfirmasi. Default/hover/focus-visible/pressed/disabled/pending. Pilih label tindakan konkret seperti Ajukan PR. |
| Input, select, date | Label selalu terlihat, helper dan error terhubung programatis, ukuran standar 40 px. Native controls bila memadai. Date picker menampilkan format lokal dan nilai tersimpan date. |
| Tabs, dropdown, tooltip | Tabs untuk panel sejajar. Dropdown untuk aksi kontekstual. Tooltip hanya untuk info tambahan. Semua popover collision-aware dan dapat dioperasikan dengan keyboard. |
| Modal/confirm | Tampilkan tindakan, dokumen, kuantitas, gudang dan dampak posting. Escape dan focus return untuk dialog biasa, konfirmasi eksplisit untuk tindakan sensitif. |
| Status, toast dan feedback | Label status selalu terlihat. Toast sukses dengan tautan ke dokumen jika relevan. Error transaksi persisten inline dengan cara memulihkan. Skeleton mengikuti geometri hasil. Empty membedakan tidak ada data dengan filter tanpa hasil. |
| Data table | Header semantik, aria-sort, search/filter/pagination server, URL-state, link detail dan baris aksi. Default 25 baris, 50 maksimum awal. Header sticky pada tabel panjang. Pilih virtualisasi hanya bila diperlukan oleh daftar panjang. |
| Form dokumen | Kelompok informasi umum, item dan review. Pertahankan nilai saat validasi gagal. Server menolak replay ganda. Simpan draft melalui aksi nyata. |
| Grafik | Gunakan tren garis atau perbandingan batang bila pertanyaan operasional memerlukan. Unit, periode, label dan alternatif tabel. Gunakan lazy load dan tampilkan empty/loading/error. |
| Print | Header dokumen, nomor, tanggal, pihak, status dan item snapshot. Hilangkan navigasi lewat media print dan ulangi header tabel pada lembar berikutnya. |

Gunakan CSS untuk feedback ringan 120–180 ms, transform/opacity bila animasi diperlukan, dan hormati reduced motion. Fokus terlihat di semua konteks dengan varian terang pada permukaan gelap. Gunakan elemen semantik, skip link, pengumuman state, pengelolaan fokus dialog, zoom 200% dan Bahasa Indonesia yang konsisten. Hindari posting stok optimistis. Setelah server mengonfirmasi, perbarui antrean dan tampilkan nomor dokumen.

Fondasi dapat memakai native HTML/CSS dan satu keluarga headless untuk kontrol kompleks yang memerlukannya. RSC untuk layar baca, client JS hanya pada interaksi, halaman tabel terpaginasikan, aset berdimensi tetap, font self-host dengan swap, chart/attachment dimuat sesuai kebutuhan dan aset statis di-cache. Target LCP ≤2,5 s, CLS ≤0,1 dan INP ≤200 ms. Ukur di Phase 9. Verifikasi aktual fokus, responsive dan overflow dimulai saat UI tersedia.
