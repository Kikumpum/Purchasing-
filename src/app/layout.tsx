import type { Metadata } from "next";
import "@fontsource-variable/geist";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Purchasing · Aryocorp", template: "%s · Purchasing Aryocorp" },
  description: "Purchasing Aryocorp untuk permintaan pembelian, pengadaan, dan persediaan.",
  applicationName: "Purchasing",
  publisher: "Aryocorp",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <body>
        <a className="skip-link" href="#main-content">Lewati ke konten</a>
        {children}
      </body>
    </html>
  );
}
