import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Outfit } from "next/font/google";
import StructuredData from "@/components/StructuredData";
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
  metadataBase: new URL("https://www.tataumana.com"),
  title: {
    default:
      "TU. by Tata Umana | Yoga, Sound Healing & Reiki in Cartagena, Colombia",
    template: "%s | TU. by Tata Umana",
  },
  description:
    "Book yoga classes, sound healing, Reiki, energy therapy & sacred ceremonies in Cartagena, Colombia. 30 years of practice. Featured in Vogue & Forbes. Private sessions from $23 USD at Casa Carolina. JustbYoga daily classes.",
  keywords: [
    // Brand
    "Tata Umana",
    "Tata Umaña",
    "TUISYOU",
    "TU by Tata Umana",
    "JustbYoga",
    "JustbYoga by TUISYOU",
    // Core services + location
    "yoga Cartagena Colombia",
    "yoga classes Cartagena",
    "sound healing Cartagena",
    "Reiki Cartagena",
    "Reiki master Cartagena Colombia",
    "sound bath Cartagena",
    "energy healing Cartagena",
    "holistic healing Cartagena",
    "wellness Cartagena Colombia",
    "meditation Cartagena",
    // Specific modalities
    "Kundalini yoga Cartagena",
    "Vinyasa yoga Cartagena",
    "Hatha yoga Cartagena",
    "Yin yoga Colombia",
    "prenatal yoga Cartagena",
    "crystal singing bowls Cartagena",
    "Tibetan bowls healing",
    "Integrated Energy Therapy Colombia",
    "Ayurveda Cartagena",
    "NLP practitioner Colombia",
    "cacao ceremony Cartagena",
    "sacred ceremonies Colombia",
    "fire ceremony Cartagena",
    "full moon ceremony Cartagena",
    // Retreats & experiences
    "wellness retreat Cartagena",
    "yoga retreat Cartagena Colombia",
    "luxury wellness Cartagena",
    "retreat center Cartagena",
    "transformational retreat Colombia",
    "corporate wellness retreat Colombia",
    "bachelorette wellness Cartagena",
    // Venue
    "Casa Carolina wellness",
    "Casa Carolina yoga",
    "Casa Carolina Cartagena",
    // Intent-based
    "book yoga class Cartagena",
    "private yoga session Cartagena",
    "wellness experience Cartagena",
    "best yoga Cartagena",
    "yoga near me Cartagena",
    "things to do Cartagena wellness",
    // Spanish keywords
    "yoga en Cartagena",
    "clases de yoga Cartagena",
    "sanacion sonora Cartagena",
    "Reiki en Cartagena Colombia",
    "bienestar Cartagena",
    "retiro de yoga Cartagena",
    "meditacion Cartagena",
    "ceremonia de cacao Cartagena",
    "terapia energetica Cartagena",
    "yoga kundalini Cartagena",
  ],
  authors: [{ name: "Tata Umana", url: "https://instagram.com/tuisyou" }],
  creator: "MachineMind Consulting",
  publisher: "TU. by Tata Umana",
  applicationName: "TU. by Tata Umana",
  category: "Health & Wellness",
  classification: "Yoga Studio, Wellness Center, Holistic Health",
  alternates: {
    canonical: "https://www.tataumana.com",
    languages: {
      "en-US": "https://www.tataumana.com",
      "es-CO": "https://www.tataumana.com",
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    alternateLocale: "es_CO",
    url: "https://www.tataumana.com",
    siteName: "TU. by Tata Umana",
    title:
      "TU. by Tata Umana | Yoga, Sound Healing & Reiki in Cartagena, Colombia",
    description:
      "Book transformative wellness experiences in Cartagena — yoga classes, sound healing, Reiki, ceremonies & retreats. 30 years of practice. Vogue-featured. Sessions from $23 USD.",
    images: [
      {
        url: "https://www.tataumana.com/opengraph-image",
        width: 1200,
        height: 630,
        type: "image/png",
        alt: "TU. by Tata Umana — Yoga, Sound Healing & Wellness in Cartagena, Colombia",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "TU. by Tata Umana | Yoga & Wellness in Cartagena",
    description:
      "Yoga, sound healing, Reiki & retreats in Cartagena, Colombia. 30 years of practice. Book from $23 USD.",
    images: ["https://www.tataumana.com/twitter-image"],
    creator: "@tuisyou",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
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
    title: "TU.",
    statusBarStyle: "black-translucent",
  },
  verification: {
    google: "6IWvjQX6ejWNWU35PnsYPu20gqgikACxRI3j58y59I8",
  },
  other: {
    "geo.region": "CO-BOL",
    "geo.placename": "Cartagena de Indias",
    "geo.position": "10.4236;-75.5506",
    ICBM: "10.4236, -75.5506",
    "contact:phone_number": "+573185083035",
    "contact:email": "tata@tuisyou.com",
    "business:contact_data:street_address": "Centro Historico, Walled City",
    "business:contact_data:locality": "Cartagena de Indias",
    "business:contact_data:country_name": "Colombia",
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
        <StructuredData />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
      </head>
      <body
        className={`${cormorant.variable} ${outfit.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
