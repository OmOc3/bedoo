import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Mawqi3 — موقعي",
    short_name: "Mawqi3",
    description:
      "Mawqi3 manages bait stations, QR inspections, field reports, and review workflows. موقعي لإدارة المحطات وتقارير الفحص الميدانية.",
    lang: "ar",
    dir: "rtl",
    start_url: "/scan",
    scope: "/",
    display: "standalone",
    background_color: "#020617",
    theme_color: "#0f766e",
  };
}
