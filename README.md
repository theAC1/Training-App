# Training App

Mobile-first WebApp für Krafttraining im Leichtathletik-Verein. Inspiriert von der UX von RP Strength mit Fokus auf extrem schnelles Logging während des Trainings.

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Sprache**: TypeScript
- **UI**: Tailwind CSS + Radix UI
- **Auth & DB**: Supabase (PostgreSQL mit RLS)
- **Forms**: react-hook-form + Zod
- **Offline**: IndexedDB (idb) + Zustand
- **Hosting**: Vercel

## Quickstart

### 1. Repository klonen

```bash
git clone https://github.com/theAC1/Training-App.git
cd Training-App
```

### 2. Dependencies installieren

```bash
npm install
```

### 3. Supabase Setup

1. Erstelle ein Projekt auf [supabase.com](https://supabase.com)
2. Führe die Migration aus: `supabase/migrations/001_initial_schema.sql`
3. Erstelle einen Storage Bucket namens `exercises` (public)

### 4. Environment Variables

Kopiere `.env.example` zu `.env.local` und fülle die Werte:

```bash
cp .env.example .env.local
```

Benötigte Variablen:
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase Project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase Anon Key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase Service Role Key
- `NEXT_PUBLIC_APP_URL` - App URL (z.B. http://localhost:3000)

### 5. Development Server starten

```bash
npm run dev
```

App öffnen: [http://localhost:3000](http://localhost:3000)

## Erster Trainer erstellen

Da die App Invite-Only ist, musst du den ersten Trainer manuell erstellen:

1. Registriere einen User über Supabase Dashboard → Authentication → Users → Add User
2. Aktualisiere das Profil in der DB:
```sql
UPDATE profiles SET role = 'trainer' WHERE id = 'USER_ID';
```

## Dokumentation

- [PRODUCT.md](./docs/PRODUCT.md) - User Flows, UX-Prinzipien, Route Map
- [ARCHITECTURE.md](./docs/ARCHITECTURE.md) - Stack, Security, Offline-Konzept
- [DATA_MODEL.md](./docs/DATA_MODEL.md) - Datenmodell, RLS Policies
- [ROADMAP.md](./docs/ROADMAP.md) - Milestones und Tasks

## Deployment auf Vercel

1. Verbinde das GitHub Repo mit Vercel
2. Setze die Environment Variables
3. Deploy

## Projekt-Struktur

```
src/
├── app/                  # Next.js App Router
│   ├── (auth)/           # Login, Signup
│   ├── (app)/            # Geschützte App-Routen
│   └── api/              # API Routes
├── components/
│   ├── ui/               # Basis-Komponenten
│   └── layout/           # Layout-Komponenten
├── lib/
│   ├── supabase/         # Supabase Client
│   └── utils.ts          # Utilities
├── hooks/                # Custom Hooks
└── stores/               # Zustand Stores
```

## Scripts

- `npm run dev` - Development Server
- `npm run build` - Production Build
- `npm run lint` - ESLint
- `npm run format` - Prettier
- `npm run type-check` - TypeScript Check

## Lizenz

Privat - Nur für den Leichtathletik-Verein
