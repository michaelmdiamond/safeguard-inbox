# SafeGuard Inbox

A platform-agnostic **Safety Hub** for parents that automatically monitors purchases for product recalls by parsing email receipts via a dedicated forwarder.

## Overview

SafeGuard Inbox lets parents:

1. **Forward purchase receipts** to a unique email alias
2. **AI (Gemini 1.5 Flash)** automatically parses receipts and extracts product details
3. **Continuous monitoring** cross-references products against CPSC, FDA, USDA, and NHTSA recall databases
4. **Instant alerts** notify parents when a recalled product is detected in their inventory

## Tech Stack

- **Frontend**: Next.js 15 (App Router), Tailwind CSS v4, Shadcn/UI-style components
- **Backend**: Supabase (PostgreSQL, Auth, Row Level Security)
- **AI**: Google Gemini 1.5 Flash for receipt parsing
- **Matching**: Levenshtein distance + text similarity for fuzzy product-to-recall matching
- **Notifications**: Resend for email alerts
- **Ingestion**: SendGrid Inbound Parse webhook

## Project Structure

```
safeguard-inbox/
├── src/
│   ├── app/
│   │   ├── page.tsx                    # Landing page
│   │   ├── layout.tsx                  # Root layout
│   │   ├── login/page.tsx              # Login page
│   │   ├── signup/page.tsx             # Signup page
│   │   ├── auth/callback/route.ts      # Auth callback
│   │   ├── (app)/                      # Authenticated layout group
│   │   │   ├── layout.tsx              # App shell with sidebar
│   │   │   ├── dashboard/page.tsx      # Dashboard with stats, alerts, inventory
│   │   │   ├── profile/page.tsx        # Email alias, how-it-works, settings
│   │   │   └── recalls/page.tsx        # Browse active recalls with search/filter
│   │   └── api/
│   │       ├── ingest/route.ts         # SendGrid webhook → Gemini → DB
│   │       ├── recalls/sync/route.ts   # CPSC/FDA/NHTSA fetch → upsert
│   │       └── match/route.ts          # Fuzzy matching endpoint
│   ├── components/
│   │   ├── ui/                         # Button, Card, Badge, Input, Label
│   │   ├── dashboard/                  # StatsCard, AlertCard, InventoryTable
│   │   └── layout/                     # AppShell (sidebar + mobile nav)
│   ├── lib/
│   │   ├── supabase/                   # Client, server, middleware clients
│   │   ├── gemini.ts                   # Receipt parsing with Gemini
│   │   ├── matching.ts                 # Levenshtein + text similarity
│   │   ├── notifications.ts            # Resend email alerts
│   │   ├── mock-data.ts                # Development mock data
│   │   └── utils.ts                    # cn() utility
│   ├── types/
│   │   └── database.ts                 # TypeScript types for all tables
│   └── middleware.ts                   # Auth session refresh
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql      # Full DB schema with RLS
├── .env.example                        # Environment variables template
└── package.json
```

## Getting Started

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project
- A [Google AI Studio](https://aistudio.google.com/) API key (for Gemini)
- A [Resend](https://resend.com) account (for email notifications)
- A [SendGrid](https://sendgrid.com) account (for inbound email parsing)

### Setup

1. **Clone and install**:
   ```bash
   git clone <repo-url>
   cd safeguard-inbox
   npm install
   ```

2. **Configure environment variables**:
   ```bash
   cp .env.example .env.local
   ```
   Fill in your Supabase URL, anon key, service role key, Gemini API key, Resend API key, etc.

3. **Set up the database**:
   Run the migration in `supabase/migrations/001_initial_schema.sql` against your Supabase project (via the SQL editor in the Supabase dashboard or the Supabase CLI).

4. **Run the development server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000).

### SendGrid Inbound Parse Setup

1. Configure a domain (e.g., `safeguard.io`) with SendGrid Inbound Parse
2. Point the webhook URL to `https://your-domain.com/api/ingest`
3. Users forward receipts to `user.<id>@safeguard.io`

### Recall Sync

Trigger the recall sync manually or via a cron job:
```bash
curl -X POST https://your-domain.com/api/recalls/sync
```

## Database Schema

### Tables

- **`user_inventory`** — Products extracted from receipts (brand, product name, model number, category)
- **`active_recalls`** — Master recall feed from CPSC, FDA, USDA, NHTSA (with pgvector embedding support)
- **`user_alerts`** — Matched recall alerts per user (with severity and status tracking)

All tables have Row Level Security enabled.

## Matching Algorithm

The system uses a two-tier matching approach:

1. **Model Number Matching** (Levenshtein distance): Fuzzy string comparison between product model numbers and recall affected models
2. **Text Similarity**: Brand name presence, product name word overlap, and affected model text matching

**Thresholds**:
- **≥ 0.85**: Auto-alert (high severity)
- **0.65 – 0.84**: Review required (medium severity, user confirms/dismisses)

## Design Language

- **Primary**: `#2563eb` (Trust Blue)
- **Warning**: `#f59e0b` (Safety Amber)
- **Style**: Clean, minimalist, professional/parental
- **Layout**: Mobile-first, responsive sidebar navigation

## License

MIT
