import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Wedding Lucky Draw",
    short_name: "Lucky Draw",
    start_url: "/",
    display: "standalone",
    orientation: "landscape",
    background_color: "#120c28",
    theme_color: "#26164d",
    icons: [
      {
        src: "/icons/icon-192.svg",
        sizes: "192x192",
        type: "image/svg+xml",
        purpose: "any"
      },
      {
        src: "/icons/icon-512.svg",
        sizes: "512x512",
        type: "image/svg+xml",
        purpose: "any"
      }
    ]
  };
}
