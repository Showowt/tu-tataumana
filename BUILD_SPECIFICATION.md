# TU. BY TATA UMAÑA — FULL BUILD SPECIFICATION
## MachineMind AI Infrastructure Project
### For Claude Code Terminal Build

---

## PROJECT OVERVIEW

**Client:** Tata Umaña — Wellness Curator, Yoga Teacher (23+ years), Reiki Master, Ceremonial Guide
**Brand:** TU. By Tata Umaña
**Location:** Cartagena, Colombia (based at Casa Carolina boutique wellness hotel)
**Instagram:** @tuisyou | @justbyogabytuisyou
**Current Linktree:** linktr.ee/tuisyou

**Business Model:** Premium holistic wellness — private sessions, group classes, sound healing, retreats, ceremonies, corporate wellness, digital content, speaking engagements.

**Press:** Featured in Vogue, Caribbean Journal, Forbes, Diners Magazine, 2 international interviews. Lead instructor at Casa Carolina (nominated Best Hotel Spa, 2025 World Spa Awards).

**Target Markets:**
- International visitors to Cartagena (heavy NYC/NJ, US East Coast)
- Colombian domestic travelers (Bogotá, Cali, Medellín)
- Online/digital audience globally
- Corporate wellness clients
- Retreat seekers

**Currency:** USD (primary), COP (secondary display)

---

## TECH STACK

```
Frontend:     Next.js 14+ (App Router) + Tailwind CSS
Backend:      Supabase (Auth + Postgres + Edge Functions + Storage)
Hosting:      Vercel
Payments:     Stripe (USD primary)
AI:           Claude API (WhatsApp concierge personality)
WhatsApp:     Twilio WhatsApp Business API
Email:        Resend (transactional) + custom marketing
Calendar:     Cal.com integration or custom booking calendar
CMS:          Supabase-powered content management
Analytics:    Vercel Analytics + custom dashboard
```

---

## BRAND GUIDELINES

### Visual Identity
- **Logo:** TU monogram (stylized T+U in shield shape) — "TATA UMAÑA" text below
- **Logo Variants:** White on dark, Rose/pink on dark, Dark on light
- **Primary Colors:**
  - Deep Rose: `#B87777`
  - Soft Rose: `#D4A5A5`
  - Charcoal: `#2C2C2C`
  - Warm Cream: `#F8F4F0`
  - Soft Gold: `#C9A96E`
- **Typography:**
  - Display: Cormorant Garamond or Playfair Display (serif, elegant)
  - Body: Lora or Source Serif Pro
  - UI/Navigation: Montserrat or Outfit (clean sans-serif)
- **Aesthetic:** Luxury wellness. Think Aman Resorts meets Goop meets ancient wisdom. Warm, grounded, feminine but not fragile. Colombian Caribbean soul with international sophistication. NO generic wellness-app vibes.
- **Photography Direction:** Natural light, warm tones, Cartagena colonial architecture, rooftop yoga, candlelit ceremonies, ocean views, lush greenery. Tata's warmth and presence is the hero.

### Tone of Voice
- Warm but authoritative
- Bilingual (English primary, Spanish secondary)
- Spiritual but grounded — never woo-woo, always accessible
- Invitational, not salesy
- "Come home to yourself" energy

---

## SITEMAP & PAGE ARCHITECTURE

```
/                           → Homepage (hero, services overview, press logos, testimonials, CTA)
/about                      → Tata's story, credentials, philosophy, press features
/services                   → Service overview grid
/services/private-sessions  → 1-on-1 offerings (yoga, reiki, IET, sound healing, ayurveda)
/services/group-classes     → Group class schedule and descriptions
/services/sound-healing     → Dedicated sound healing page
/services/ceremonies        → Sacred ceremonies and special experiences
/services/corporate         → Corporate wellness programs and speaking
/retreats                   → Retreat listings (current + upcoming)
/retreats/[slug]            → Individual retreat detail page with booking
/book                       → Booking portal (calendar view, service selection, payment)
/content                    → Digital content library (subscription-gated)
/content/[slug]             → Individual content piece (video/audio player)
/events                     → Upcoming special events
/contact                    → Contact form + WhatsApp link + location info
/blog                       → Articles, wellness insights, Cartagena guides
/admin                      → Protected admin dashboard
/admin/bookings             → Booking management
/admin/clients              → Client CRM
/admin/content              → Content management
/admin/analytics            → Revenue & performance dashboard
```

---

## DATABASE SCHEMA (Supabase/Postgres)

```sql
-- CLIENTS
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  email TEXT UNIQUE,
  phone TEXT,
  whatsapp TEXT,
  first_name TEXT NOT NULL,
  last_name TEXT,
  language TEXT DEFAULT 'en', -- 'en' or 'es'
  city TEXT,
  country TEXT,
  source TEXT, -- 'website', 'whatsapp', 'instagram', 'referral', 'casa_carolina'
  referral_source TEXT,
  notes TEXT,
  tags TEXT[], -- ['vip', 'retreat_interest', 'corporate', 'subscriber']
  total_spent DECIMAL(10,2) DEFAULT 0,
  total_sessions INTEGER DEFAULT 0,
  last_session_date TIMESTAMPTZ,
  stripe_customer_id TEXT
);

-- SERVICES
CREATE TABLE services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  name_en TEXT NOT NULL,
  name_es TEXT NOT NULL,
  description_en TEXT,
  description_es TEXT,
  category TEXT NOT NULL, -- 'private_session', 'group_class', 'sound_healing', 'ceremony', 'retreat', 'corporate', 'speaking'
  duration_minutes INTEGER,
  price_usd DECIMAL(10,2),
  price_cop DECIMAL(12,2),
  max_participants INTEGER DEFAULT 1,
  location TEXT, -- 'casa_carolina', 'online', 'client_location', 'special_venue'
  is_active BOOLEAN DEFAULT true,
  image_url TEXT,
  sort_order INTEGER DEFAULT 0
);

-- BOOKINGS
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  client_id UUID REFERENCES clients(id),
  service_id UUID REFERENCES services(id),
  status TEXT DEFAULT 'pending', -- 'pending', 'confirmed', 'completed', 'cancelled', 'no_show'
  booking_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME,
  participants INTEGER DEFAULT 1,
  participant_names TEXT[],
  total_price_usd DECIMAL(10,2),
  deposit_paid DECIMAL(10,2) DEFAULT 0,
  balance_due DECIMAL(10,2),
  payment_status TEXT DEFAULT 'unpaid', -- 'unpaid', 'deposit_paid', 'paid', 'refunded'
  stripe_payment_id TEXT,
  notes TEXT,
  special_requests TEXT,
  source TEXT DEFAULT 'website', -- 'website', 'whatsapp', 'phone', 'walk_in'
  reminder_sent BOOLEAN DEFAULT false,
  follow_up_sent BOOLEAN DEFAULT false
);

-- PACKAGES
CREATE TABLE packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_en TEXT NOT NULL,
  name_es TEXT NOT NULL,
  description_en TEXT,
  description_es TEXT,
  included_services JSONB, -- [{service_id, quantity}]
  price_usd DECIMAL(10,2),
  sessions_included INTEGER,
  validity_days INTEGER DEFAULT 90,
  is_active BOOLEAN DEFAULT true
);

-- CLIENT PACKAGES (purchased)
CREATE TABLE client_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id),
  package_id UUID REFERENCES packages(id),
  purchased_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  sessions_remaining INTEGER,
  stripe_payment_id TEXT,
  status TEXT DEFAULT 'active' -- 'active', 'expired', 'exhausted'
);

-- RETREATS
CREATE TABLE retreats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  title_en TEXT NOT NULL,
  title_es TEXT NOT NULL,
  description_en TEXT,
  description_es TEXT,
  start_date DATE,
  end_date DATE,
  location TEXT,
  max_participants INTEGER,
  current_participants INTEGER DEFAULT 0,
  price_tiers JSONB, -- [{name, price_usd, includes}]
  deposit_amount_usd DECIMAL(10,2),
  itinerary JSONB, -- [{day, activities: [{time, title, description}]}]
  images TEXT[],
  status TEXT DEFAULT 'upcoming', -- 'upcoming', 'open', 'sold_out', 'completed'
  waitlist_enabled BOOLEAN DEFAULT false
);

-- RETREAT REGISTRATIONS
CREATE TABLE retreat_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  retreat_id UUID REFERENCES retreats(id),
  client_id UUID REFERENCES clients(id),
  tier TEXT,
  price_usd DECIMAL(10,2),
  deposit_paid DECIMAL(10,2) DEFAULT 0,
  balance_due DECIMAL(10,2),
  status TEXT DEFAULT 'registered', -- 'registered', 'waitlisted', 'confirmed', 'cancelled'
  stripe_payment_id TEXT,
  dietary_requirements TEXT,
  emergency_contact TEXT,
  special_needs TEXT
);

-- DIGITAL CONTENT
CREATE TABLE content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  slug TEXT UNIQUE NOT NULL,
  title_en TEXT NOT NULL,
  title_es TEXT,
  description_en TEXT,
  description_es TEXT,
  category TEXT, -- 'guided_meditation', 'sound_healing', 'yoga_flow', 'masterclass', 'talk'
  media_url TEXT, -- Supabase Storage or external
  thumbnail_url TEXT,
  duration_minutes INTEGER,
  is_free BOOLEAN DEFAULT false,
  is_published BOOLEAN DEFAULT false,
  access_level TEXT DEFAULT 'subscriber', -- 'free', 'subscriber', 'premium'
  view_count INTEGER DEFAULT 0,
  sort_order INTEGER DEFAULT 0
);

-- SUBSCRIPTIONS
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id),
  plan TEXT NOT NULL, -- 'monthly', 'annual'
  price_usd DECIMAL(10,2),
  stripe_subscription_id TEXT,
  status TEXT DEFAULT 'active', -- 'active', 'cancelled', 'past_due'
  started_at TIMESTAMPTZ DEFAULT NOW(),
  current_period_end TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ
);

-- EVENTS
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  title_en TEXT NOT NULL,
  title_es TEXT,
  description_en TEXT,
  description_es TEXT,
  event_date DATE,
  start_time TIME,
  end_time TIME,
  location TEXT,
  max_participants INTEGER,
  price_usd DECIMAL(10,2),
  image_url TEXT,
  status TEXT DEFAULT 'upcoming'
);

-- TESTIMONIALS
CREATE TABLE testimonials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_name TEXT NOT NULL,
  client_location TEXT,
  content_en TEXT NOT NULL,
  content_es TEXT,
  service_type TEXT,
  rating INTEGER,
  is_featured BOOLEAN DEFAULT false,
  is_published BOOLEAN DEFAULT true,
  date TIMESTAMPTZ DEFAULT NOW()
);

-- WHATSAPP CONVERSATIONS (for AI concierge tracking)
CREATE TABLE whatsapp_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number TEXT NOT NULL,
  client_id UUID REFERENCES clients(id),
  messages JSONB DEFAULT '[]',
  status TEXT DEFAULT 'active', -- 'active', 'escalated', 'resolved'
  intent TEXT, -- 'booking', 'inquiry', 'followup', 'support'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ANALYTICS EVENTS
CREATE TABLE analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL, -- 'page_view', 'booking_started', 'booking_completed', 'payment', 'whatsapp_inquiry'
  metadata JSONB,
  client_id UUID REFERENCES clients(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security policies
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE content ENABLE ROW LEVEL SECURITY;
-- (Add appropriate policies for admin access)

-- Indexes
CREATE INDEX idx_bookings_date ON bookings(booking_date);
CREATE INDEX idx_bookings_client ON bookings(client_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_clients_email ON clients(email);
CREATE INDEX idx_content_category ON content(category);
CREATE INDEX idx_content_published ON content(is_published);
```

---

## AI WHATSAPP CONCIERGE PERSONALITY

```
SYSTEM PROMPT FOR TU. AI CONCIERGE:

You are TU — the digital extension of Tata Umaña's wellness practice in Cartagena, Colombia.

VOICE & PERSONALITY:
- Warm, grounded, and inviting — like a wise friend who happens to be a master healer
- Bilingual: detect the client's language and respond in kind (English or Spanish)
- Never clinical or cold. Never overly sales-y.
- Use first name after learning it
- Speak with confidence about Tata's offerings — you know everything about her practice

WHAT YOU KNOW:
- Complete service menu with pricing (in USD)
- Tata's schedule and availability
- Casa Carolina details and location
- Retreat information and dates
- Package options and pricing
- What each modality involves and who it's best for
- Cartagena wellness scene context

WHAT YOU DO:
1. Welcome warmly and ask what they're looking for
2. Recommend the right service based on their needs
3. Capture booking information (date, time, service, group size)
4. Explain pricing in USD
5. Send booking confirmation with payment link
6. Answer questions about what to expect
7. Follow up after sessions

ESCALATION TRIGGERS (hand to Tata):
- Custom retreat planning
- Medical or health condition disclosures
- VIP/celebrity requests
- Corporate partnership inquiries
- Complaints or issues
- Requests for services not on the menu
- When client explicitly asks to speak with Tata

UPSELLING (natural, never pushy):
- Private yoga → "Many clients also love adding a sound healing after yoga"
- Single session → "Our 3-session package saves 15%"
- In-person → "Tata also offers guided meditations you can access from home"
- First-timer → "If you enjoy this, our retreat in [date] might be perfect"

NEVER:
- Give medical advice
- Diagnose conditions
- Promise specific healing outcomes
- Share other clients' information
- Make up availability — check the system
- Be dismissive of any spiritual practice or belief system
```

---

## KEY FEATURES TO BUILD

### 1. Booking Calendar
- Visual calendar showing available slots
- Service selection → date/time selection → participant details → payment
- Timezone-aware (show in client's timezone)
- Stripe Checkout for payment
- Automatic confirmation emails (bilingual)
- iCal integration
- Admin can block dates, set recurring schedules

### 2. Retreat Portal
- Beautiful landing pages per retreat
- Multi-tier pricing with comparison
- Deposit flow (collect deposit now, balance later)
- Waitlist when sold out
- Automated email sequences (confirmation, preparation, follow-up)
- Participant portal with logistics info

### 3. Digital Content Platform
- Video/audio player with subscription gate
- Monthly and annual subscription plans via Stripe
- Free content (teasers) vs subscriber content
- Content categories: Guided Meditations, Sound Healing, Yoga Flows, Masterclasses
- Progress tracking
- Favorites/saved content

### 4. Admin Dashboard
- Booking management (confirm, cancel, reschedule)
- Client CRM with full history
- Revenue analytics (daily, weekly, monthly, by service type)
- Content management (upload, publish, organize)
- WhatsApp conversation log
- Package/subscription tracking

### 5. WhatsApp AI Integration
- Twilio WhatsApp Business API
- Claude API for intelligent responses
- Booking creation directly from WhatsApp
- Payment link generation
- Escalation to human (Tata) with context
- Conversation history in CRM

---

## DEPLOYMENT PIPELINE

```
Mac Terminal → GitHub (main branch) → Vercel Auto-Deploy

Domain: tataumana.com (or tuisyou.com — check availability)
Staging: tu-staging.vercel.app
Production: tataumana.com
```

---

## ENV VARIABLES NEEDED

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Stripe
STRIPE_SECRET_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=

# Twilio (WhatsApp)
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_WHATSAPP_NUMBER=

# Claude API (for WhatsApp AI)
ANTHROPIC_API_KEY=

# Resend (Email)
RESEND_API_KEY=

# Cal.com (if using)
CAL_API_KEY=

# General
NEXT_PUBLIC_SITE_URL=
NEXT_PUBLIC_DEFAULT_CURRENCY=USD
```

---

## BUILD ORDER (Drop Sequence)

### Drop 001: Foundation + Homepage
- Next.js project setup with Tailwind
- Brand system (colors, fonts, components)
- Homepage with hero, services grid, press logos, testimonials, CTA
- Navigation + footer
- Mobile responsive
- **DEMO PATH: Homepage is live and beautiful**

### Drop 002: About + Services Pages
- About page with Tata's story and press features
- Services overview and individual service pages
- Contact page with WhatsApp link

### Drop 003: Booking Engine
- Supabase setup with full schema
- Service selection → date picker → checkout flow
- Stripe integration for USD payments
- Booking confirmation emails
- Admin booking management page

### Drop 004: WhatsApp AI Concierge
- Twilio WhatsApp Business API connection
- Claude API integration with TU personality prompt
- Booking creation from WhatsApp
- Escalation logic
- Conversation logging to Supabase

### Drop 005: Client CRM
- Client profiles with booking history
- Tags and segmentation
- Notes and communication log
- Search and filter

### Drop 006: Retreat Portal
- Retreat detail pages
- Tiered pricing and deposit flow
- Registration management
- Waitlist functionality

### Drop 007: Digital Content Platform
- Content upload and management
- Subscription plans via Stripe
- Video/audio player with access control
- Content library with categories

### Drop 008: Analytics + Marketing
- Revenue dashboard
- Booking analytics
- Automated email campaigns (Resend)
- SEO optimization

### Drop 009: Polish + Launch
- Performance optimization
- Full bilingual content pass
- Testing all flows end-to-end
- DNS and domain setup
- Go live

---

## SUCCESS METRICS

| Metric | Target (Month 1) | Target (Month 3) | Target (Month 6) |
|--------|-------------------|-------------------|-------------------|
| Website bookings | 10 | 30 | 60 |
| WhatsApp AI conversations | 50 | 150 | 300 |
| Revenue from online bookings | $1,500 | $5,000 | $12,000 |
| Digital subscribers | 10 | 50 | 150 |
| Retreat registrations | - | 5 | 15 |
| Average response time | <30 sec | <30 sec | <30 sec |

---

## BLUE OCEAN VECTORS

1. **Intelligence Layer:** AI concierge learns client preferences, remembers past sessions, personalizes recommendations — no other wellness practitioner in Cartagena has this.

2. **Workflow Lock-in:** Once clients have booking history, package credits, saved content, and relationship data in the system — switching to another practitioner means losing all of that.

3. **Distribution Loop:** Digital content creates global reach. Global reach drives retreat bookings. Retreat bookings create testimonials. Testimonials drive more digital subscriptions.

4. **Data Moat:** Over time, the system accumulates data on what services are most popular, optimal pricing, seasonal trends, client lifetime value — intelligence no competitor has.

---

*MachineMind Consulting | Built with APEX Architecture + BCB-OS v2.0*
*Philip McGill & Sergio Sandoval*
