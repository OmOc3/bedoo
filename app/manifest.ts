import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Bedoo — إدارة محطات الطعوم",
    short_name: "Bedoo",
    description: "إدارة محطات الطعوم وتقارير الفحص الميدانية",
    lang: "ar",
    dir: "rtl",
    start_url: "/scan",
    scope: "/",
    display: "standalone",
    background_color: "#020617",
    theme_color: "#0f766e",
  };
}
