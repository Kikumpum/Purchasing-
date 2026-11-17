type GuideTopic = {
  title: string;
  keywords: string[];
  text: string;
  href: string;
};

export type GuideAnswer = { text: string; href?: string; title?: string };

export const guideTopics: GuideTopic[] = [
  { title: "Masuk dan pemulihan akun", keywords: ["login", "masuk", "password", "sandi", "lupa", "akun"],
    href: "/masuk", text: "Masuk menggunakan email akun Purchasing dan kata sandi yang sudah Anda aktifkan. Jika lupa kata sandi, buka halaman masuk, pilih Lupa kata sandi, lalu minta tautan pemulihan. Periksa kotak masuk dan folder spam. Hubungi pengelola jika akun atau peran Anda belum aktif." },
  { title: "Peran dan akses pengguna", keywords: ["jobdesk", "role", "peran", "wewenang", "akses", "employee", "manager", "admin"],
    href: "/dashboard", text: "Employee membuat dan memantau permintaan sendiri. Manager memutuskan permintaan yang ditugaskan dan melihat data sesuai cakupan departemennya. Admin Procurement mengelola pengadaan, vendor, PO dan stok lintas gudang. Warehouse menerima dan mengeluarkan barang pada gudang yang ditugaskan. Peran ditetapkan oleh pengelola akun." },
  { title: "Membuat permintaan dan OPKB", keywords: ["permintaan", "opkb", "pengajuan", "draft", "mengajukan"],
    href: "/permintaan", text: "Di menu Permintaan pembelian, isi barang, jumlah, satuan, tujuan dan tanggal kebutuhan. Referensi OPKB dapat dipakai untuk beberapa barang. Simpan draft, periksa isian, lalu ajukan untuk persetujuan. Jika diminta revisi, baca catatan Manager, perbaiki isian dan ajukan kembali." },
  { title: "Persetujuan Manager", keywords: ["persetujuan", "approve", "menyetujui", "menolak", "revisi", "approval"],
    href: "/permintaan", text: "Manager membuka permintaan yang ditugaskan melalui menu Permintaan pembelian. Periksa kebutuhan dan rincian barang, lalu pilih keputusan yang tersedia. Tambahkan catatan saat menolak atau meminta revisi. Keputusan mengikuti peran, cakupan departemen dan status dokumen." },
  { title: "Pengadaan dan vendor", keywords: ["pengadaan", "vendor", "quotation", "penawaran", "membeli"],
    href: "/pengadaan", text: "Admin Procurement membuka antrean PR yang sudah disetujui. Buka detail PR untuk memeriksa stok, mengalokasikan pemenuhan internal atau melanjutkan penawaran dan PO untuk kebutuhan pembelian. Vendor dikelola melalui tombol Kelola vendor. Setiap aksi mengikuti status dokumen yang sedang dibuka." },
  { title: "Penerimaan barang PO", keywords: ["terima", "menerima", "penerimaan", "receipt", "po"],
    href: "/gudang", text: "Petugas Warehouse membuka Gudang, lalu memilih PO pada bagian Penerimaan PO. Isi jumlah yang benar-benar diterima, periksa sisa pesanan dan simpan penerimaan. Penerimaan parsial dapat dilanjutkan sampai pesanan terpenuhi. PO harus sudah dikirim ke gudang yang menjadi akses petugas." },
  { title: "Stok, pengeluaran dan opname", keywords: ["stok", "saldo", "barang", "pengeluaran", "transfer", "opname", "gudang", "alokasi"],
    href: "/gudang", text: "Buka Gudang untuk melihat saldo fisik, reservasi dan stok tersedia sesuai akses Anda. Pengeluaran PR dilakukan dari alokasi dengan jumlah dan penerima yang sesuai. Gunakan formulir opname untuk mengajukan hasil hitung fisik. Hasil hitung menunggu review sebelum koreksi stok berlaku. Nilai stok terbaru tersedia pada halaman Gudang." },
  { title: "Revisi, pembatalan dan histori", keywords: ["hapus", "delete", "batal", "pembatalan", "histori", "posted", "terposting"],
    href: "/permintaan", text: "Aksi edit, penarikan dan pembatalan tersedia sesuai peran serta status dokumen. Buka detail dokumen dan periksa aksi yang tersedia. Dokumen serta pergerakan stok yang sudah terposting mempertahankan histori. Koreksi transaksi terposting memerlukan proses koreksi yang disetujui pengelola." },
  { title: "Laporan dan ekspor", keywords: ["laporan", "csv", "ekspor", "export", "periode"],
    href: "/laporan", text: "Buka Laporan dan tentukan periode yang dibutuhkan. Ringkasan mengikuti cakupan akses akun. Warehouse dan Admin Procurement dapat membuka rincian pergerakan untuk pengeluaran atau transfer, lalu mengekspor CSV halaman aktif dengan filter yang sama. Tanggal laporan memakai waktu operasional WIB." },
];

function normalize(text: string): string {
  return text.toLocaleLowerCase("id-ID").replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

export function answerGuide(question: string): GuideAnswer {
  const words = new Set(normalize(question).split(" "));
  const ranked = guideTopics.map((topic) => ({
    topic, score: topic.keywords.filter((keyword) => words.has(keyword)).length,
  })).sort((a, b) => b.score - a.score);
  const match = ranked[0];
  if (!match || match.score === 0) {
    return { text: "Panduan ini mencakup akun, jobdesk, permintaan, persetujuan, pengadaan, gudang dan laporan. Coba pertanyaan seperti Bagaimana membuat OPKB? atau Bagaimana menerima barang PO? Jawaban AI untuk pertanyaan umum belum diaktifkan." };
  }
  return { text: match.topic.text, href: match.topic.href, title: match.topic.title };
}
