import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "TU. by Tata Umana — Wellness Curator",
    short_name: "TU.",
    description:
      "Yoga, sound healing, Reiki, ceremonies & retreats in Cartagena, Colombia. 30 years of practice with Vogue-featured wellness curator Tata Umana.",
    start_url: "/",
    display: "standalone",
    background_color: "#FAF8F5",
    theme_color: "#FAF8F5",
    icons: [
      {
        src: "/icon",
        sizes: "32x32",
        type: "image/png",
      },
      {
        src: "/apple-icon",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  };
}
