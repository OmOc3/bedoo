import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";
import { RegisterServiceWorker } from "@/components/pwa/register-service-worker";
import { i18n } from "@/lib/i18n";

export const viewport: Viewport = {
  themeColor: "#0f766e",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: {
    default: `${i18n.appNameArabic} | ${i18n.appTitle}`,
    template: `%s | ${i18n.appName}`,
  },
  description: `${i18n.en.appName} manages bait stations, QR inspections, field reports, and review workflows. ${i18n.appNameArabic} لإدارة المحطات وتقارير الفحص الميدانية.`,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html data-default-locale="ar" dir="rtl" lang="ar" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        <Script id="theme-script" src="/theme-init.js" strategy="beforeInteractive" />
      </head>
      <body>
        {children}
        <RegisterServiceWorker />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
