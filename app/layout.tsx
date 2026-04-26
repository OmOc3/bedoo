import type { Metadata } from "next";
import "./globals.css";
import { RegisterServiceWorker } from "@/components/pwa/register-service-worker";
import { i18n } from "@/lib/i18n";

const themeScript = `
(() => {
  const storageKey = "bedoo-theme";
  const root = document.documentElement;
  const savedTheme = window.localStorage.getItem(storageKey);
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const theme = savedTheme === "dark" || savedTheme === "light" ? savedTheme : prefersDark ? "dark" : "light";
  root.classList.toggle("dark", theme === "dark");
  root.dataset.theme = theme;
})();
`;

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
    <html dir="rtl" lang="ar" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800&display=swap"
          rel="stylesheet"
        />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        {children}
        <RegisterServiceWorker />
      </body>
    </html>
  );
}
