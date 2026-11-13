# Permission matrix

Scope mengikuti role aktif pada database dan assignment saat operasi. Matriks berikut adalah usulan Phase 0. “—” berarti ditolak secara default.

| Kemampuan | Employee | Manager | Admin Procurement | Warehouse |
|---|---|---|---|---|
| Dashboard | Pribadi | Departemen yang ditugaskan | Procurement lintas gudang | Gudang ditugaskan |
| Profil | Diri, field aman | Diri, field aman | Diri, field aman | Diri, field aman |
| Pengguna/role/assignment | — | — | Hanya capability provisioning terpisah | — |
| Katalog aktif | Baca | Baca | Kelola master | Baca |
| Departemen/gudang master | Referensi minimum | Referensi sesuai scope | Kelola | Referensi operasi gudang |
| PR create/edit/submit | Milik sendiri pada state yang sah | — | — | — |
| PR read/history | Milik sendiri | Departemen, PR submitted | PR yang pernah disetujui, sesuai proses | Proyeksi baris siap issue di gudang |
| PR approve/reject/revise | — | Assigned approver, department match, bukan pemohon | — | — |
| Stok/ledger | — | — | Baca lintas gudang | Baca gudang ditugaskan |
| Alokasi/reservasi | Status PR sendiri | Status PR dalam scope | Buat/lepas sesuai PR | Konsumsi via issue dalam scope |
| Vendor/quotation/harga | — | — | Kelola dan lihat histori | Identitas vendor minimum untuk receipt |
| PO dokumen komersial | — | — | Buat/approve/catat sent/cancel/close | Proyeksi receipt gudang tujuan tanpa harga |
| Penerimaan dan issue | Status PR sendiri | Status PR dalam scope | Baca histori | Posting dan baca gudang berizin |
| Transfer | — | — | Baca histori | Draft/submit/dispatch dengan akses asal, terima dengan akses tujuan |
| Opname dan adjustment | — | — | Baca dan review/post adjustment, beda aktor | Hitung dan ajukan di gudang berizin |
| Cetak dan laporan | PR sendiri | PR scope departemen | Scope procurement dan stok | Dokumen serta laporan gudang |
| Notifikasi | Penerima | Penerima | Penerima | Penerima |
| Audit global | — | — | Hanya capability audit terpisah | — |

Manager dibatasi oleh assignment departemen. Procurement dan warehouse memperoleh proyeksi field yang diperlukan untuk operasi. Hak melihat transfer dari salah satu endpoint memberi akses pada dokumen transfer terkait dengan field minimum. Setiap command menguji akses endpoint yang tepat. Read/unread hanya dapat diubah pemilik notifikasi. Pengguna tanpa profil aktif kehilangan akses walau masih memiliki sesi Auth.

Direkomendasikan provisioning awal melalui operator tepercaya. Capability delegasi hanya dapat diberikan operator tersebut, dengan lingkup eksplisit. Delegasi tidak dapat menaikkan kewenangan sendiri, memberi capability provisioning/audit, atau mengubah akun operator. Prosedur bootstrap, alih approver dan otorisasi reversal diputuskan sebelum fase terkait.
