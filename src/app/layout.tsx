import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Outfit } from "next/font/google";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-display",
  display: "swap",
});

const outfit = Outfit({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-body",
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#FAF8F5",
};

export const metadata: Metadata = {
  metadataBase: new URL("https://tu-tataumana.vercel.app"),
  title: "TU. by Tata Umana | Wellness Curator - Cartagena, Colombia",
  description:
    "30 years of yoga, Reiki, Ayurveda, sound healing & ceremonial practice. Transformative wellness experiences in Cartagena. Featured in Vogue, Forbes, Caribbean Journal.",
  keywords: [
    "Tata Umana",
    "wellness Cartagena",
    "yoga Cartagena Colombia",
    "sound healing",
    "Reiki master",
    "retreat Cartagena",
    "Casa Carolina wellness",
    "luxury wellness",
    "wellness curator",
  ],
  authors: [{ name: "Tata Umana" }],
  creator: "MachineMind Consulting",
  applicationName: "TU. by Tata Umana",
  openGraph: {
    type: "website",
    locale: "en_US",
    alternateLocale: "es_CO",
    url: "https://tu-tataumana.vercel.app",
    siteName: "TU. by Tata Umana",
    title: "TU. by Tata Umana | Come Home to Yourself",
    description:
      "Transformative wellness experiences in Cartagena, Colombia. Yoga, sound healing, Reiki, ceremonies & retreats with Vogue-featured practitioner Tata Umana.",
    images: [
      {
        url: "https://tu-tataumana.vercel.app/opengraph-image",
        width: 1200,
        height: 630,
        type: "image/png",
        alt: "TU. by Tata Umana — Wellness Curator",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "TU. by Tata Umana | Wellness Curator",
    description:
      "Transformative wellness experiences. Yoga, sound healing, Reiki & retreats in Cartagena.",
    images: ["https://tu-tataumana.vercel.app/twitter-image"],
  },
  robots: { index: true, follow: true },
  icons: {
    icon: [
      { url: "/icon", sizes: "32x32", type: "image/png" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    apple: [{ url: "/apple-icon", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    title: "TU.",
    statusBarStyle: "black-translucent",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth overflow-x-hidden">
      <body
        className={`${cormorant.variable} ${outfit.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
