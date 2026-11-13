# Aturan bisnis

## PR dan keputusan

Employee menyimpan baris PR dengan produk aktif, jumlah positif, tujuan kebutuhan, tanggal dan catatan. Submit memerlukan setidaknya satu baris. Simpan snapshot departemen dan approver saat pengajuan, tambah nomor putaran, dan kirim notifikasi. Manager harus masih berwenang dalam departemen dan merupakan approver yang tercatat. Aktor yang sama dengan pemohon selalu ditolak. Jika assignment berubah, operasional berwenang mengalihkan PR pending melalui aksi terpisah yang diaudit. Approval mencatat aktor, waktu, keputusan, putaran dan komentar. Penolakan dan revisi mewajibkan alasan. Revisi menjaga histori putaran sebelumnya.

## Alokasi, reservasi dan issue

- Procurement menetapkan jumlah internal dan/atau eksternal per baris PR serta gudang. Jumlah alokasi efektif maksimal jumlah PR. Alokasi efektif adalah kuantitas awal dikurangi sisa yang dibatalkan secara sah. Jumlah sudah dikeluarkan tetap terhitung.
- Tampilkan stok fisik, reserved dan available per gudang. Available = physical − reserved. Jumlah internal terkunci saat reservasi dibuat. Bagian eksternal mengikat kuantitas melalui PO, lalu jumlah layak dari receipt diposting dan langsung direservasi untuk PR yang sama.
- Warehouse melihat jumlah yang siap di-issue di gudangnya. Issue mendebit fisik dan reservasi yang tepat, maksimum sisa reservasi dan sisa kebutuhan, dengan identitas penerima dan tanggal. Satu PR dapat di-issue beberapa kali dari gudang berbeda.
- Procurement boleh melepas sisa reservasi internal dengan alasan, atau membatalkan komitmen eksternal melalui lifecycle PO. Barang yang telah diterima tetap punya reservasi sampai di-issue atau dilepas melalui command berizin yang membuka alokasi kembali. Reversal menyesuaikan saldo, dokumen dan reservasi terkait bersama.
- PR berstatus fulfilled ketika total net issue setiap baris sama dengan jumlah diminta. Penerimaan PO saja belum memenuhi PR.

## Quotation dan PO

Quotation mencatat masa berlaku, mata uang, harga, diskon, pajak, biaya tambahan, termin dan ETA bila tersedia. Perbandingan menyamakan item/UOM, kuantitas dan mata uang. Tampilkan quotation berbeda mata uang terpisah tanpa konversi otomatis. Pemilihan mencatat alasan dan sumber. Quotation yang kedaluwarsa harus diperbarui sebelum PO disetujui. Vendor harus aktif saat PO baru disetujui.

Satu PO berasal dari satu PR, vendor dan gudang tujuan. Beberapa PO dapat memenuhi satu PR. PO memakai harga snapshot quotation. Usulan hitung per baris adalah subtotal = qty × harga, diskon mengurangi subtotal, pajak dihitung atas harga neto. Biaya tambahan dirinci dan taxability ditetapkan eksplisit. Simpan rounding policy dan alokasikan biaya secara deterministik bila perlu. Uji total terhadap aturan Finance sebelum Phase 6. PO disetujui lalu pengiriman dicatat dengan waktu, aktor, kanal dan referensi.

## Receipt dan retur

Warehouse hanya dapat menerima PO sent atau partially_received di gudang tujuan. Catat jumlah layak, ditolak/rusak, tanggal, catatan dan bukti privat bila aktif. Jumlah layak kumulatif maksimal jumlah dipesan. Per receipt, layak + ditolak wajib positif dan maksimal sisa sebelum receipt. Jumlah ditolak memerlukan alasan, dicatat sebagai kejadian, dan menyisakan kewajiban pengiriman. Contoh PO 100, diterima 60, ditolak 5, sisa 40. Receipt pengganti boleh memenuhi sisa 40. Barang ditolak berada dalam penanganan fisik terpisah dari saldo aplikasi sampai kebijakan karantina disepakati.

PO sebagian diterima dapat ditutup dengan alasan short-close. Sisa eksternal yang belum diterima dilepas dari alokasi agar bisa dipenuhi kembali. Barang layak yang sudah diposting tetap tercatat. Koreksi receipt mengikuti aturan reversal dan ditolak jika stok atau reservasi yang dibutuhkan untuk reversal sudah terpakai.

## Transfer

Warehouse asal mengajukan transfer dan mengirim hanya jika saldo tersedia masih cukup di waktu posting. Pengiriman mengurangi fisik asal dan menambah transit per baris transfer pada commit yang sama. Warehouse tujuan mengonfirmasi jumlah aktual, kumulatif maksimal jumlah dikirim. Setiap receipt mengurangi transit dan menambah fisik tujuan. Sisa transit tetap terbuka sampai diterima atau diselesaikan melalui transaksi kompensasi berizin dengan alasan. Pelacakan transit terpisah dari on-hand semua gudang.

## Opname dan koreksi

Mulai sesi per gudang. Catat baseline qty dan stock_version saat item disiapkan untuk hitung, jumlah aktual, selisih dan alasan. Ajukan setelah semua hitungan lengkap. Jika saldo fisik berubah sejak baseline, hitung ulang item tersebut, termasuk saat terjadi perubahan antara submit dan approval. Procurement menyetujui adjustment dengan aktor terpisah dari pengaju. Cegah hasil fisik lebih rendah dari reserved sampai reservasi direkonsiliasi. Simpan adjustment dan ledger dalam satu commit. Baris tanpa selisih ditutup dengan record review tanpa pergerakan stok. Sesi selesai setelah semua adjustment diposting atau ditolak dan diselesaikan.

Untuk dokumen posted, perintah kompensasi mencatat dokumen sumber, alasan, aktor, approval dan delta kebalikan. Validasi dependent documents, stok, reserved dan saldo transit. Contoh receipt yang telah di-issue harus menunggu penyelesaian issue terkait sebelum dapat dikoreksi. Tambahkan history dan kembalikan state operasional sesuai jumlah neto. Detail approval tiap tipe reversal dan tata cara selisih transfer perlu keputusan sebelum Phase 7.

## Notifikasi

Submit PR memberi tahu approver tercatat. Keputusan memberi tahu pemohon dan approval juga memberi tahu antrean procurement. PO dibuat/disetujui memberi tahu procurement terkait. PO sent memberi tahu warehouse tujuan yang berizin menerima. Receipt memberi tahu procurement dan, jika barang siap issue, petugas issue yang berizin. Issue memberi tahu pemohon. Dispatch transfer memberi tahu gudang tujuan, lalu receipt memberi tahu gudang asal. Adjustment diajukan memberi tahu procurement dan keputusan memberi tahu pengaju. Tentukan penerima aktif dari scope saat event terjadi, deduplikasi per event/penerima, dan cek ulang akses dokumen saat tautan dibuka.
