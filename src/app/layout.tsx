import type { Metadata } from "next";
import "@fontsource-variable/geist";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Purchasing Workspace", template: "%s · Purchasing Workspace" },
  description: "Ruang kerja pengadaan dan persediaan.",
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
