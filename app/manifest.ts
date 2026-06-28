import type { MetadataRoute } from "next";
import { BRAND } from "./brand";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${BRAND.arabicName} | ${BRAND.englishName}`,
    short_name: BRAND.arabicName,
    description: BRAND.description,
    start_url: "/",
    display: "standalone",
    background_color: "#f7fbf9",
    theme_color: "#0b7a5c",
    lang: "ar",
    dir: "rtl",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any maskable"
      }
    ]
  };
}
