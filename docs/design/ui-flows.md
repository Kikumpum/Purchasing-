# Rancangan alur layar

Token dan komponen ada di [design system](../../DESIGN_SYSTEM.md).

| Tugas | Jalur layar | Informasi dan tindakan |
|---|---|---|
| Ajukan PR | Permintaan Saya → Buat PR → draft → cek dan ajukan | Form kebutuhan dan baris item. Validasi per baris. Detail setelah submit menunjukkan approver, status dan histori. |
| Review Manager | Persetujuan → detail PR → keputusan | Permintaan, pemohon, waktu kebutuhan, komentar dan putaran. Approve sebagai tindakan utama. Reject/revision membuka dialog dengan alasan wajib. |
| Pemenuhan Procurement | Antrean PR → detail → alokasi → quotation/PO | Kolom qty diminta, stok fisik/reserved/available, gudang, sisa. Perbandingan quotation berdampingan untuk satu mata uang. Tampilkan dasar harga dan status. |
| Receipt | Penerimaan → PO terbuka → input aktual → konfirmasi | Sisa PO, jumlah layak dan ditolak, kondisi, tanggal dan catatan. Setelah post, tampilkan dokumen hasil dan sisa terbaru. |
| Issue | Pengeluaran → PR siap issue → input → konfirmasi | Reservasi, gudang, penerima, jumlah parsial dan bukti cetak. |
| Transfer | Transfer → detail → dispatch atau receipt | Asal, tujuan, item, dikirim/diterima/sisa transit, aksi sesuai endpoint. |
| Opname | Opname → sesi → hasil hitung → ajukan | Qty sistem, aktual, selisih dan alasan. Tandai baseline berubah per item. Review adjustment mencatat keputusan dan histori. |
| Laporan | Laporan → tipe → filter → detail/unduh | Periode, scope dan unit angka yang eksplisit. Tautkan aggregate ke dokumen sumber. |

Sketsa alur ini menjadi input implementasi. Validasi dengan keyboard, pengguna operasional, layar 375/768/1280 px dan zoom 200%. Periksa filter yang tetap saat kembali dari detail serta error bisnis yang mempertahankan input.
