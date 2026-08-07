import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Wedding Lucky Draw",
    short_name: "Lucky Draw",
    start_url: "/",
    display: "standalone",
    background_color: "#120c28",
    theme_color: "#26164d"
  };
}
