# Training-App - Architektur

## Stack-Entscheidung

### Framework & Sprache

| Komponente | Technologie | Begründung |
|------------|-------------|------------|
| Framework | Next.js 14+ (App Router) | SSR, API Routes, Vercel-optimiert |
| Sprache | TypeScript | Typsicherheit, bessere DX |
| UI | Tailwind CSS + Radix UI | Schnell, Dark Mode ready, accessible |
| Icons | Lucide React | Konsistent, tree-shakeable |

### Backend & Daten

| Komponente | Technologie | Begründung |
|------------|-------------|------------|
| Auth | Supabase Auth | Invite-Only via Custom Logic, RLS-kompatibel |
| Datenbank | Supabase (PostgreSQL) | RLS für Security, kostenlos für MVP |
| Storage | Supabase Storage | Integriert, signed URLs möglich |
| Validierung | Zod | Runtime-Validierung, TypeScript-Integration |

### Client

| Komponente | Technologie | Begründung |
|------------|-------------|------------|
| Forms | react-hook-form | Performant, minimale Re-Renders |
| State | Zustand | Leichtgewichtig, für Offline-Queue |
| Offline | IndexedDB (idb) | Robuste lokale Speicherung |
| Date/Time | date-fns | Tree-shakeable, German locale |

## Warum Supabase?

### Vorteile für dieses Projekt

1. **Invite-Only Auth**: Custom Invite-Tabelle + Auth Integration
2. **RLS (Row Level Security)**: Security auf DB-Ebene, nicht nur App-Layer
3. **Storage integriert**: Bild-Upload ohne extra Service
4. **Realtime optional**: Falls später Live-Sync gewünscht
5. **Free Tier**: Ausreichend für 3-8 Athleten
6. **TypeScript Types**: Auto-generiert aus Schema

### Alternativen (nicht gewählt)

- **Prisma + PlanetScale**: Mehr Setup, keine RLS
- **Firebase**: Vendor Lock-in, komplexere Security
- **Drizzle + Turso**: Gut, aber weniger Ökosystem

## Projekt-Struktur

```
/
├── docs/                    # Dokumentation
├── public/                  # Statische Assets
├── src/
│   ├── app/                 # Next.js App Router
│   │   ├── (auth)/          # Auth-Routen (Login, Signup)
│   │   ├── (app)/           # Geschützte App-Routen
│   │   │   ├── dashboard/
│   │   │   ├── session/
│   │   │   ├── exercises/
│   │   │   ├── plan/
│   │   │   ├── athletes/
│   │   │   └── settings/
│   │   ├── api/             # API Routes
│   │   ├── layout.tsx
│   │   └── globals.css
│   ├── components/
│   │   ├── ui/              # Basis-UI-Komponenten
│   │   ├── training/        # Training-spezifische Komponenten
│   │   └── layout/          # Layout-Komponenten
│   ├── lib/
│   │   ├── supabase/        # Supabase Client Setup
│   │   ├── db/              # Database Queries
│   │   ├── validators/      # Zod Schemas
│   │   └── utils.ts         # Utility Functions
│   ├── hooks/               # Custom React Hooks
│   ├── stores/              # Zustand Stores
│   └── types/               # TypeScript Types
├── supabase/
│   └── migrations/          # SQL Migrations
└── ...config files
```

## Security-Konzept

### Authentication

1. **Invite-Only Signup**
   - Trainer erstellt Invite-Code
   - Code hat Ablaufdatum und optionalen Namen
   - Athlet nutzt Code für Registrierung
   - Code wird als "verwendet" markiert

2. **Session Management**
   - Supabase Auth Cookies (httpOnly)
   - Middleware prüft Auth bei jedem Request

### Authorization (RLS)

```sql
-- Beispiel: Athleten sehen nur eigene Logs
CREATE POLICY "Users can view own logs"
ON set_logs FOR SELECT
USING (athlete_id = auth.uid());

-- Trainer sehen alle Logs ihrer Athleten
CREATE POLICY "Trainers can view athlete logs"
ON set_logs FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'trainer'
  )
);
```

### Input Validation

- Zod-Schemas für alle Eingaben
- Server-seitige Validierung in API Routes
- Client-seitige Validierung für UX

### Rate Limiting

- [Annahme] Supabase eingebautes Rate Limiting für Auth
- Für API Routes: Edge Middleware mit einfachem Counter
- Alternative: Upstash Redis für komplexere Limits

## Offline-Sync-Konzept

### Architektur

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   UI/React  │────▶│  Zustand     │────▶│  IndexedDB  │
│             │     │  (Sync Queue)│     │  (idb)      │
└─────────────┘     └──────────────┘     └─────────────┘
                           │
                           ▼ (when online)
                    ┌──────────────┐
                    │  Supabase    │
                    │  (Backend)   │
                    └──────────────┘
```

### Sync-Strategie

1. **Logging lokal zuerst**
   - Set-Log wird in IndexedDB gespeichert
   - `client_uuid` für Deduplizierung generiert
   - `synced: false` Flag gesetzt

2. **Sync-Queue**
   - Zustand Store hält Pending-Items
   - Bei Online: Items werden gesendet
   - Retry mit Exponential Backoff
   - Nach Success: `synced: true`

3. **Konflikt-Handling**
   - Set-Logs: Append-only (kein echter Konflikt)
   - `client_uuid` verhindert Duplikate
   - Server ignoriert bereits existierende UUIDs

4. **Daten-Caching**
   - Zugewiesene Sessions werden gecacht
   - Übungsdaten werden gecacht
   - Cache-Invalidierung bei Online-Verbindung

### PWA Setup

```typescript
// next.config.ts (PWA wird in Milestone 5 hinzugefügt)
// Service Worker für App Shell
// Workbox für Cache-Strategien
```

## Deployment

### Vercel

1. **Projekt verbinden**
   - GitHub Repo verbinden
   - Automatic Deploys bei Push

2. **Environment Variables**
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`

3. **Build Settings**
   - Framework: Next.js (auto-detected)
   - Build Command: `npm run build`
   - Output: `.next`

### Supabase

1. **Projekt erstellen**
   - Region: Frankfurt (eu-central-1)
   - Tier: Free für MVP

2. **Migrations ausführen**
   - Über Supabase Dashboard oder CLI
   - Schema in `supabase/migrations/`

3. **Storage einrichten**
   - Bucket: `exercises` (public)
   - Policies für Upload (nur Trainer)

## Performance-Überlegungen

### Client

- Code-Splitting per Route
- Lazy Loading für Bilder
- Optimistic UI für Logging
- Minimale Bundle-Größe

### Server

- Edge Functions für Auth Middleware
- Supabase Connection Pooling
- Indexed Queries

### Mobile

- Touch-optimierte Interaktionen
- Viewport Meta Tags
- Safe Area Insets (iPhone)
