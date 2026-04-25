import type { Metadata } from "next";
import "./globals.css";
import { i18n } from "@/lib/i18n";

export const metadata: Metadata = {
  title: {
    default: `${i18n.appTitle} | ${i18n.appName}`,
    template: `%s | ${i18n.appName}`,
  },
  description: i18n.appTitle,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
