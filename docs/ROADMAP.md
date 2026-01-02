# Training-App - Roadmap

## Milestones Übersicht

| Milestone | Name | Beschreibung | Status |
|-----------|------|--------------|--------|
| 1 | Foundation | Stack, Auth, Layout, Routing | 🔄 In Progress |
| 2 | Übungsdatenbank | CRUD, Varianten, Bild-Upload | ⏳ Pending |
| 3 | Plan Builder | Meso, Sessions, Blocks | ⏳ Pending |
| 4 | Athlet Execution | Logging, Auto-Save, Historie | ⏳ Pending |
| 5 | Offline PWA Sync | Service Worker, IndexedDB, Sync | ⏳ Pending |
| 6 | Polish & Deploy | Performance, A11y, Final QA | ⏳ Pending |

---

## Milestone 1: Foundation

**Ziel:** Solides technisches Fundament mit funktionierender Auth.

### Tasks

- [x] Next.js Projekt mit TypeScript initialisieren
- [x] Dependencies installieren (Supabase, UI, Forms)
- [x] ESLint, Prettier Konfiguration
- [x] Tailwind mit Dark Mode Setup
- [x] Dokumentation erstellen (PRODUCT, ARCHITECTURE, DATA_MODEL, ROADMAP)
- [ ] Supabase Projekt & Schema
- [ ] Supabase Client Integration
- [ ] Auth Middleware
- [ ] Invite-Only Signup Flow
- [ ] Login/Logout Flow
- [ ] Basis-Layout mit Navigation
- [ ] Route-Skeleton (alle Hauptrouten)
- [ ] Dark Mode Toggle

### Akzeptanzkriterien

1. App startet ohne Fehler (`npm run dev`)
2. Login-Seite wird angezeigt
3. Signup nur mit gültigem Invite-Code möglich
4. Nach Login → Dashboard (role-based)
5. Dark Mode funktioniert
6. Navigation zwischen Hauptrouten möglich

---

## Milestone 2: Übungsdatenbank

**Ziel:** Trainer kann Übungen mit Varianten und Bildern verwalten.

### Tasks

- [ ] Exercise CRUD API Routes
- [ ] Exercise-Liste Ansicht
- [ ] Exercise-Detail Ansicht
- [ ] Neue Übung Formular
- [ ] Bild-Upload zu Supabase Storage
- [ ] Varianten-Hierarchie (Parent auswählen)
- [ ] Video-URL Feld
- [ ] Such- und Filteroptionen
- [ ] Kategorien und Muskelgruppen als Tags

### Akzeptanzkriterien

1. Trainer kann neue Übung anlegen (Name, Bild, Kategorie)
2. Bild wird hochgeladen und angezeigt
3. Variante kann Parent-Übung referenzieren
4. Übungen sind filterbar nach Kategorie/Muskel
5. Athlet sieht Übungen readonly

---

## Milestone 3: Plan Builder

**Ziel:** Trainer kann komplette Mesozyklen mit Sessions planen.

### Tasks

- [ ] Mesocycle CRUD
- [ ] Session CRUD innerhalb Meso
- [ ] Session-Block System (Single, Superset, Cluster)
- [ ] Übungen zu Blocks hinzufügen
- [ ] Prescription setzen (Sets, Reps, Gewicht, RIR, Pause)
- [ ] Cluster-Konfiguration (Reps, Count, Pause)
- [ ] Meso einem Athleten zuweisen
- [ ] Wochen-Übersicht (4 Wochen Default)
- [ ] Session-Vorschau

### Akzeptanzkriterien

1. Trainer kann Meso mit 4 Wochen erstellen
2. Jede Woche kann Sessions enthalten
3. Superset mit 2+ Übungen erstellbar
4. Cluster-Set konfigurierbar
5. Athlet sieht zugewiesene Mesos

---

## Milestone 4: Athlet Execution

**Ziel:** Athlet kann Training loggen - schnell und einfach.

### Tasks

- [ ] Session-Ansicht für Athlet
- [ ] Block/Übungs-Navigation
- [ ] Set-Logger Komponente
- [ ] Reps-Eingabe (Pflicht)
- [ ] Gewicht-Anpassung (optional)
- [ ] Pain Flag Checkbox
- [ ] Auto-Save nach Eingabe
- [ ] Rest-Timer mit Start/Stop
- [ ] Session abschließen
- [ ] Übungshistorie Ansicht
- [ ] Personal Best Erkennung
- [ ] PB-Anzeige auf Dashboard
- [ ] Streak-Counter

### Akzeptanzkriterien

1. Set-Logging in < 5 Sekunden möglich
2. Gewicht ist vorbefüllt, änderbar
3. Pain Flag kann gesetzt werden
4. Timer funktioniert (manuell)
5. Historie zeigt letzte Logs
6. PBs werden erkannt und angezeigt
7. Streak wird auf Dashboard gezeigt

---

## Milestone 5: Offline PWA Sync

**Ziel:** App funktioniert offline, Daten werden zuverlässig synchronisiert.

### Tasks

- [ ] Service Worker Setup (next-pwa)
- [ ] App Shell Caching
- [ ] Session-Daten in IndexedDB cachen
- [ ] Set-Logs lokal speichern
- [ ] Sync-Queue implementieren
- [ ] Online/Offline Detection
- [ ] Sync bei Reconnect
- [ ] Pending-Counter UI
- [ ] client_uuid Generierung
- [ ] Deduplizierung am Server
- [ ] Retry mit Backoff
- [ ] Konflikt-Handling (append-only)

### Akzeptanzkriterien

1. App öffnet offline (cached Shell)
2. Zugewiesene Sessions sind offline verfügbar
3. Logs werden lokal gespeichert
4. Beim Reconnect: automatischer Sync
5. Keine Duplikate nach Sync
6. Pending-Counter zeigt wartende Logs
7. Counter geht nach Sync auf 0

---

## Milestone 6: Polish & Deploy

**Ziel:** Produktionsreife App auf Vercel.

### Tasks

- [ ] Performance Audit (Lighthouse)
- [ ] Accessibility Check
- [ ] iPhone Safari Spezifika
- [ ] Android Chrome Test
- [ ] Safe Area Insets
- [ ] Touch Feedback verbessern
- [ ] Error Boundaries
- [ ] Loading States
- [ ] Empty States
- [ ] Seed-Daten für Demo
- [ ] Vercel Deployment Setup
- [ ] Environment Variables
- [ ] Domain konfigurieren (optional)
- [ ] README für Deployment

### Akzeptanzkriterien

1. Lighthouse Performance > 80
2. Lighthouse Accessibility > 90
3. Funktioniert auf iPhone Safari
4. Funktioniert auf Android Chrome
5. Deployment reproduzierbar dokumentiert
6. Keine kritischen Fehler in Console

---

## Post-MVP Roadmap (Future)

### Phase 2: Erweiterungen

- [ ] Variable Meso-Länge (nicht nur 4 Wochen)
- [ ] Coach Analytics Dashboard
- [ ] Trainingsvolumen-Tracking
- [ ] Export-Funktionen (CSV, PDF)
- [ ] Push Notifications
- [ ] Multi-Trainer Support

### Phase 3: Tests & Messungen

- [ ] Test-Typen definieren (Sprint, Sprung, etc.)
- [ ] Test-Eingabe für Athleten
- [ ] Test-Historie und Trends
- [ ] Verknüpfung mit Training

### Phase 4: Erweiterte Features

- [ ] Auto-Progression Logik
- [ ] RPE statt RIR Option
- [ ] Video-Analyse Integration
- [ ] Erweiterte Gamification
- [ ] Team-Challenges (opt-in)
