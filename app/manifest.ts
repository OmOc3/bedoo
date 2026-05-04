import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "EcoPest",
    short_name: "EcoPest",
    description: "EcoPest manages bait stations, QR inspections, field reports, and review workflows.",
    lang: "en",
    dir: "ltr",
    start_url: "/scan",
    scope: "/",
    display: "standalone",
    background_color: "#020617",
    theme_color: "#0f766e",
    icons: [
      {
        src: "/brand/ecopest-icon.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/brand/ecopest-icon.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
