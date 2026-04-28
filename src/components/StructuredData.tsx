export default function StructuredData() {
  const baseUrl = "https://www.tataumana.com";

  const localBusiness = {
    "@context": "https://schema.org",
    "@type": ["HealthAndBeautyBusiness", "SportsActivityLocation"],
    "@id": `${baseUrl}/#business`,
    name: "TU. by Tata Umana",
    alternateName: ["JustbYoga by TUISYOU", "TUISYOU"],
    description:
      "Transformative wellness experiences in Cartagena, Colombia. Yoga classes, sound healing, Reiki, Ayurveda, energy work, sacred ceremonies, and personalized retreats with 30-year practitioner Tata Umana. Featured in Vogue, Forbes, and Caribbean Journal.",
    url: baseUrl,
    telephone: "+573185083035",
    email: "tata@tuisyou.com",
    image: `${baseUrl}/opengraph-image`,
    logo: `${baseUrl}/tu-logo.png`,
    founder: {
      "@type": "Person",
      "@id": `${baseUrl}/#person`,
      name: "Tata Umana",
      alternateName: "Tata Umaña",
      jobTitle: "Wellness Curator & Energy Mentor",
      description:
        "Certified Reiki Master, IET practitioner, yoga teacher with 30+ years experience. Featured in Vogue, Forbes, Caribbean Journal. Wellness Lead at Casa Carolina boutique hotel, Cartagena.",
      knowsAbout: [
        "Yoga",
        "Sound Healing",
        "Reiki",
        "Integrated Energy Therapy",
        "Ayurveda",
        "Kundalini Yoga",
        "Sacred Ceremonies",
        "Holistic Wellness",
        "NLP",
        "Prenatal Yoga",
      ],
      sameAs: [
        "https://instagram.com/tuisyou",
        "https://instagram.com/justbyogabytuisyou",
      ],
      worksFor: {
        "@type": "Organization",
        name: "Casa Carolina Boutique Hotel",
      },
    },
    address: {
      "@type": "PostalAddress",
      streetAddress: "Centro Historico, Walled City",
      addressLocality: "Cartagena de Indias",
      addressRegion: "Bolivar",
      addressCountry: "CO",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: 10.4236,
      longitude: -75.5506,
    },
    areaServed: [
      {
        "@type": "City",
        name: "Cartagena de Indias",
        containedInPlace: { "@type": "Country", name: "Colombia" },
      },
      {
        "@type": "Place",
        name: "Virtual / Online",
      },
    ],
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: [
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
        ],
        opens: "07:00",
        closes: "21:00",
      },
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: "Sunday",
        opens: "09:00",
        closes: "12:00",
      },
    ],
    priceRange: "$23 - $2095 USD",
    currenciesAccepted: "COP, USD",
    paymentAccepted:
      "Cash, Credit Card, Debit Card, Nequi, Bancolombia, Zelle, PayPal",
    sameAs: [
      "https://instagram.com/tuisyou",
      "https://instagram.com/justbyogabytuisyou",
    ],
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "Wellness Services",
      itemListElement: [
        {
          "@type": "OfferCatalog",
          name: "Group Yoga Classes",
          itemListElement: [
            offer("Morning Vinyasa Flow", "Dynamic breath-synchronized yoga to start your day in Cartagena", "80000", "COP", "PT75M"),
            offer("Gentle Restore Yoga", "Slow nurturing practice with extended holds for deep release", "80000", "COP", "PT60M"),
            offer("Power Yoga", "Dynamic strength-building practice. Sweat, challenge, transform.", "80000", "COP", "PT60M"),
            offer("Sunset Yin Yoga", "Deep stretching meditation as the sun sets over Cartagena", "80000", "COP", "PT90M"),
            offer("Kundalini Awakening", "Energy work, breathwork, kriyas — the yoga of awareness", "80000", "COP", "PT90M"),
            offer("Sound Healing Group Session", "Crystal bowls, Tibetan bowls, tuning forks — lie down and receive", "80000", "COP", "PT75M"),
          ],
        },
        {
          "@type": "OfferCatalog",
          name: "Private Wellness Services",
          itemListElement: [
            offer("Discovery Session", "One-on-one consultation to design your personal transformation path", "85000", "COP", "PT30M"),
            offer("Personalized Private Yoga", "Tailored sessions in Hatha, Vinyasa, Kundalini, Yin, or Ashtanga", "190000", "COP", "PT60M"),
            offer("Sound Healing Private Session", "Crystal singing bowls, Tibetan bowls, tuning forks — deep cellular healing", "320000", "COP", "PT90M"),
            offer("Reiki & Integrated Energy Therapy", "Japanese energy healing + cellular memory release", "485000", "COP", "PT75M"),
            offer("Quantum Surgery", "Powerful energetic transmutation for deep cellular restoration", "320000", "COP", "PT60M"),
            offer("Superior Connection", "Profound session connecting you with higher consciousness", "730000", "COP", "PT75M"),
            offer("Energy Cleansing", "For couples, homes, or workspaces — honoring authentic love", "485000", "COP", "PT75M"),
            offer("Sacred Ceremonies", "Cacao, Full Moon, New Moon, Fire ceremonies — marking life's moments", "3500000", "COP"),
            offer("TUISYOU Personalized Program", "3-month comprehensive transformation journey — the ultimate investment in yourself", "7750000", "COP", "P3M"),
          ],
        },
      ],
    },
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      faq("What yoga classes are available in Cartagena?", "TU. by Tata Umana offers daily group yoga classes at Casa Carolina in Cartagena's walled city — including Vinyasa Flow, Hatha, Yin, Kundalini, Power Yoga, and Restorative. Classes start at $80,000 COP ($22 USD). Private sessions also available."),
      faq("What is sound healing and how does it work?", "Sound healing uses instruments like crystal singing bowls, Tibetan bowls, and tuning forks to create vibrations that help your body relax and heal. You lie down fully clothed and receive — the vibrations bypass the thinking mind and speak directly to your cells. Most people enter a deeply relaxed state."),
      faq("Do I need experience to do yoga with Tata Umana?", "No experience needed! Many clients are complete beginners. Private sessions are designed for YOUR body and YOUR level. Tata adapts every practice to where you are. Flexibility is a result of practice, not a requirement."),
      faq("What is Reiki energy healing?", "Reiki is a Japanese energy healing technique where universal life force energy is channeled through the practitioner's hands. Tata is a certified Reiki Master in the Usui lineage with 15+ years of practice. You lie fully clothed and may feel warmth, tingling, or deep relaxation."),
      faq("Where is TU. by Tata Umana located?", "TU. is located at Casa Carolina Boutique Hotel in the Centro Historico (Walled City) of Cartagena de Indias, Colombia. Tata can also travel to your hotel or villa within Cartagena for private sessions."),
      faq("What payment methods are accepted?", "Credit/debit cards via Wompi (Visa, Mastercard, Amex), Nequi (3185083035), Bancolombia transfer (Ahorros 207-859047-00), Zelle/PayPal (+1 917 453 8307), and cash in COP or USD."),
      faq("Can I book a wellness retreat in Cartagena?", "Yes! The TUISYOU Personalized Program is a 3-month transformation journey ($7,750,000 COP / $2,095 USD). Custom retreats for groups (bachelorette parties, corporate teams, families) are also available. Contact Tata via WhatsApp +57 318 508 3035."),
      faq("Are virtual yoga and wellness sessions available?", "Yes! Video Connection sessions are available for personalized guidance from anywhere in the world — 60 min ($170,000 COP / $46 USD) or 30 min ($120,000 COP / $33 USD)."),
    ],
  };

  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: baseUrl },
      { "@type": "ListItem", position: 2, name: "Classes & Schedule", item: `${baseUrl}/#schedule` },
      { "@type": "ListItem", position: 3, name: "Private Services", item: `${baseUrl}/#services` },
      { "@type": "ListItem", position: 4, name: "Retreats", item: `${baseUrl}/#retreats` },
      { "@type": "ListItem", position: 5, name: "Payment", item: `${baseUrl}/#payment` },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusiness) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
    </>
  );
}

function offer(name: string, description: string, price: string, currency: string, duration?: string) {
  const item: Record<string, unknown> = {
    "@type": "Offer",
    itemOffered: {
      "@type": "Service",
      name,
      description,
      provider: { "@id": "https://www.tataumana.com/#person" },
      areaServed: { "@type": "City", name: "Cartagena de Indias" },
      ...(duration && { duration }),
    },
    price,
    priceCurrency: currency,
    availability: "https://schema.org/InStock",
    url: "https://www.tataumana.com",
  };
  return item;
}

function faq(question: string, answer: string) {
  return {
    "@type": "Question",
    name: question,
    acceptedAnswer: {
      "@type": "Answer",
      text: answer,
    },
  };
}
