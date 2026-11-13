# State transition

Server memilih target state dari perintah eksplisit dan kondisi terkunci. Histori menyimpan state asal/tujuan, aktor, waktu, versi dan alasan saat relevan. State terminal hanya berubah melalui kompensasi yang terdefinisi. Command yang tidak memenuhi guard gagal tanpa perubahan.

| Dokumen | Dari → ke | Aktor dan guard |
|---|---|---|
| PR | draft / revision_requested → pending_approval | Employee pemilik, dokumen valid dan approver aktif. |
| PR | pending_approval → approved / rejected / revision_requested | Manager tercatat dan masih dalam scope, bukan pemohon. Alasan wajib untuk reject/revision. |
| PR | approved → in_fulfillment | Procurement membuat alokasi pertama. Kembali ke approved jika semua alokasi, komitmen dan posting bersih sudah dibatalkan atau dikompensasi. |
| PR | in_fulfillment → fulfilled | Dihitung setelah issue. Seluruh baris terpenuhi neto. Reversal yang sah dapat mengembalikan ke in_fulfillment. |
| Quotation | draft → available → used | Procurement, versi valid saat seleksi. Used mengunci harga dan syarat. Expired adalah kondisi tanggal. |
| Quotation | draft / available → withdrawn | Procurement, belum dirujuk PO aktif. |
| PO | draft → approved → sent | Procurement, guard persetujuan dan pencatatan pengiriman masing-masing. |
| PO | sent / partially_received → partially_received / received | Warehouse tujuan, receipt sah. State berasal dari jumlah layak neto semua baris. |
| PO | draft / approved / sent → cancelled | Procurement, alasan dan tanpa posting receipt apa pun termasuk receipt penolakan. Lepas komitmen. |
| PO | received → closed | Procurement, final review. |
| PO | sent / partially_received → closed | Procurement, short-close dengan alasan dan pelepasan sisa komitmen. |
| Receipt/issue | created → posted | Warehouse berizin. Satu perintah posting membuat dokumen dan transaksi secara atomik. Histori memuat kompensasi terkait. |
| Transfer | draft → pending → in_transit | Warehouse asal berizin, submit lalu posting dispatch dengan stok cukup. |
| Transfer | in_transit / partially_received → partially_received / received | Warehouse tujuan. Semua transit bersih diterima untuk received. |
| Transfer | draft / pending → cancelled | Warehouse asal dengan alasan, sebelum dispatch. |
| Opname | draft → counting → submitted | Warehouse dalam scope, semua item punya hitungan saat submit. |
| Opname | submitted → counting / completed | Procurement mengembalikan jika perlu hitung ulang. Sistem menyelesaikan saat seluruh baris terselesaikan. |
| Adjustment | pending → posted / rejected | Procurement berbeda aktor. Validasi version fisik, alasan, dan batas reservasi. Alasan wajib untuk reject. |
| Adjustment | pending → superseded | Otomatis saat opname dikembalikan, proposal versi lama tetap tersimpan. Gunakan satu adjustment efektif per versi hitung dan satu posting efektif per baris. |

Transisi dari kompensasi harus menjaga dependency. PO received dapat dikembalikan ke sent/partially_received oleh reversal yang sah. PO closed memerlukan review dan reopen eksplisit sebelum reversal. Transfer dengan selisih pasca dispatch memerlukan resolusi terdokumentasi. Transisi resolusi transit ditetapkan pada Phase 7 setelah kebijakan selisih disetujui.
