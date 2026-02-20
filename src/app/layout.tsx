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
  themeColor: "#2C2C2C",
};

export const metadata: Metadata = {
  metadataBase: new URL("https://tu-tataumana.vercel.app"),
  title: "TU. by Tata Umaña | Wellness Curator · Cartagena, Colombia",
  description:
    "23 years of yoga, Reiki, Ayurveda, sound healing & ceremonial practice — distilled into transformative experiences that reconnect you with what matters most. Featured in Vogue, Forbes, Caribbean Journal. Lead instructor at Casa Carolina.",
  keywords: [
    "Tata Umaña",
    "wellness Cartagena",
    "yoga Cartagena Colombia",
    "sound healing",
    "Reiki master",
    "retreat Cartagena",
    "Casa Carolina wellness",
    "holistic healing",
    "guided meditation",
    "Ayurveda Colombia",
    "luxury wellness",
    "wellness curator",
  ],
  authors: [{ name: "Tata Umaña" }],
  creator: "MachineMind Consulting",
  applicationName: "TU. by Tata Umaña",
  openGraph: {
    type: "website",
    locale: "en_US",
    alternateLocale: "es_CO",
    url: "https://tu-tataumana.vercel.app",
    siteName: "TU. by Tata Umaña",
    title: "TU. by Tata Umaña | Come Home to Yourself",
    description:
      "Transformative wellness experiences in Cartagena, Colombia. Yoga, sound healing, Reiki, ceremonies & retreats with Vogue-featured practitioner Tata Umaña.",
    images: [
      {
        url: "https://tu-tataumana.vercel.app/opengraph-image",
        secureUrl: "https://tu-tataumana.vercel.app/opengraph-image",
        width: 1200,
        height: 630,
        type: "image/png",
        alt: "TU. by Tata Umaña — Wellness Curator · Cartagena, Colombia",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "TU. by Tata Umaña | Wellness Curator · Cartagena",
    description:
      "Transformative wellness experiences. Yoga, sound healing, Reiki & retreats with Vogue-featured practitioner.",
    images: ["https://tu-tataumana.vercel.app/twitter-image"],
    creator: "@tataumana",
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: [
      { url: "/icon", sizes: "32x32", type: "image/png" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    apple: [{ url: "/apple-icon", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    title: "TU. by Tata Umaña",
    statusBarStyle: "black-translucent",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
      </head>
      <body className={`${cormorant.variable} ${outfit.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
