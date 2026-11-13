# Purchasing Workspace

Fondasi web Next.js untuk pengadaan dan persediaan. Buka [status implementasi](PROJECT_STATUS.md) dan [rencana proyek](IMPLEMENTATION_PLAN.md) untuk perkembangan modul.

## Jalankan lokal

Gunakan Node.js 22.15 atau lebih baru dan npm. Dari direktori proyek, jalankan:

```sh
npm ci
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000). Ringkasan dan halaman Konfigurasi dapat dibuka saat variabel Supabase masih kosong.

Untuk menyiapkan Supabase, salin .env.example ke .env.local, isi URL proyek dan kunci publishable, lalu restart server. Kunci anon lama juga diterima. Gunakan URL HTTPS untuk proyek remote. Halaman Konfigurasi menampilkan status validasi format tanpa menampilkan nilainya. Validasi koneksi memakai migrasi dan pengujian fase database.

## Pemeriksaan

```sh
npm run lint
npm run typecheck
npm test
npm run build
```

Jalankan `npm run test:smoke` saat server aktif di port 3000. Set `PURCHASING_SMOKE_URL` untuk memakai alamat lokal yang berbeda.

## Vercel

Ikuti [panduan impor repositori ke Vercel](docs/deployment/plan.md#impor-ke-vercel).
