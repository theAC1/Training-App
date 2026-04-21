# Training-App - Roadmap

## Milestones Übersicht

| Milestone | Name | Beschreibung | Status |
|-----------|------|--------------|--------|
| 1 | Foundation | Stack, Auth, Layout, Routing | ✅ Completed |
| 2 | Übungsdatenbank | CRUD, Varianten, Bild-URLs | ✅ Completed |
| 3 | Plan Builder | Meso, Sessions, Blocks | ✅ Completed |
| 4 | Athlet Execution | Logging, Timer, Historie | ⚠️ Partial |
| 5 | Offline PWA Sync | Service Worker, IndexedDB, Sync | ✅ Completed |
| 6 | Athlet UI & Polish | Session-Ausführung, Finish MVP | 🏗️ In Progress |

---

## Milestone 1: Foundation ✅

**Ziel:** Solides technisches Fundament mit funktionierender Auth.

### Tasks

- [x] Next.js Projekt mit TypeScript initialisieren
- [x] Dependencies installieren (Supabase, UI, Forms)
- [x] ESLint, Prettier Konfiguration
- [x] Tailwind mit Dark Mode Setup
- [x] Dokumentation erstellen (PRODUCT, ARCHITECTURE, DATA_MODEL, ROADMAP)
- [x] Supabase Projekt & Schema
- [x] Supabase Client Integration (Browser + Server)
- [x] Auth Middleware (Session-Management)
- [x] Invite-Only Signup Flow
- [x] Login/Logout Flow (Email + Google OAuth)
- [x] Basis-Layout mit Navigation
- [x] Route-Skeleton (alle Hauptrouten)
- [x] Dark Mode Toggle

### Akzeptanzkriterien ✅

1. ✅ App startet ohne Fehler
2. ✅ Login-Seite wird angezeigt
3. ✅ Signup nur mit gültigem Invite-Code möglich
4. ✅ Nach Login → Dashboard (role-based)
5. ✅ Dark Mode funktioniert
6. ✅ Navigation zwischen Hauptrouten möglich

---

## Milestone 2: Übungsdatenbank ✅

**Ziel:** Trainer kann Übungen mit Varianten verwalten.

### Tasks

- [x] Exercise CRUD API Routes
- [x] Exercise-Liste Ansicht
- [x] Exercise-Detail Ansicht
- [x] Neue Übung Formular
- [x] Varianten-Hierarchie (Parent auswählen)
- [x] Video-URL Feld
- [x] Kategorien und Muskelgruppen als Felder
- [ ] ~~Bild-Upload zu Supabase Storage~~ (nur URL-basiert)
- [ ] ~~Such- und Filteroptionen~~ (verschoben nach Post-MVP)

### Akzeptanzkriterien ✅

1. ✅ Trainer kann neue Übung anlegen (Name)
2. ✅ Bild-URL kann hinterlegt werden
3. ✅ Variante kann Parent-Übung referenzieren
4. ⏸️ Filter nach Kategorie/Muskel (verschoben)
5. ✅ Athlet sieht Übungen readonly

---

## Milestone 3: Plan Builder ✅

**Ziel:** Trainer kann komplette Mesozyklen mit Sessions planen.

### Tasks

- [x] Mesocycle CRUD
- [x] Session CRUD innerhalb Meso
- [x] Session-Block System (Single, Superset, Cluster)
- [x] Übungen zu Blocks hinzufügen
- [x] Prescription setzen (Sets, Reps, Gewicht, RIR, Pause)
- [x] Cluster-Konfiguration (Reps, Count, Pause)
- [x] Meso einem Athleten zuweisen
- [x] Wochen-Übersicht
- [x] Session-Vorschau

### Akzeptanzkriterien ✅

1. ✅ Trainer kann Meso mit konfigurierbaren Wochen erstellen
2. ✅ Jede Woche kann Sessions enthalten
3. ✅ Superset mit 2+ Übungen erstellbar
4. ✅ Cluster-Set konfigurierbar
5. ✅ Athlet sieht zugewiesene Mesos

---

## Milestone 4: Athlet Execution ⚠️ PARTIAL

**Ziel:** Athlet kann Training loggen - schnell und einfach.

### Backend (✅ Done)

- [x] Set-Log Datenmodell
- [x] Set-Log API (POST, GET)
- [x] Client UUID für Deduplizierung
- [x] Batch-Insert Support

### Frontend (❌ Missing - Kritisch!)

- [ ] **Session-Ausführungs-UI für Athlet**
- [ ] Block/Übungs-Navigation während Session
- [ ] Set-Logger Komponente mit Inline-Eingabe
- [ ] Reps-Eingabe (Pflicht)
- [ ] Gewicht-Anpassung (optional, vorbefüllt)
- [ ] Pain Flag Checkbox
- [ ] Auto-Save nach Eingabe
- [ ] Rest-Timer mit Start/Stop

### Zusatzfeatures (⏸️ Verschoben)

- [ ] Session abschließen Funktion
- [ ] Übungshistorie Ansicht
- [ ] Personal Best Erkennung
- [ ] PB-Anzeige auf Dashboard
- [ ] Streak-Counter

### Akzeptanzkriterien

1. ❌ Set-Logging in < 5 Sekunden möglich
2. ❌ Gewicht ist vorbefüllt, änderbar
3. ❌ Pain Flag kann gesetzt werden
4. ❌ Timer funktioniert
5. ⏸️ Historie zeigt letzte Logs
6. ⏸️ PBs werden erkannt
7. ⏸️ Streak auf Dashboard

---

## Milestone 5: Offline PWA Sync ✅

**Ziel:** App funktioniert offline, Daten werden zuverlässig synchronisiert.

### Tasks

- [x] Service Worker Setup (next-pwa)
- [x] App Shell Caching
- [x] Session-Daten in IndexedDB cachen
- [x] Set-Logs lokal speichern
- [x] Sync-Queue implementieren
- [x] Online/Offline Detection
- [x] Sync bei Reconnect
- [x] Pending-Counter UI
- [x] client_uuid Generierung
- [x] Deduplizierung am Server
- [x] Retry mit Backoff
- [x] Konflikt-Handling (append-only)

### Akzeptanzkriterien ✅

1. ✅ App öffnet offline (cached Shell)
2. ✅ Infrastructure für offline Sessions vorhanden
3. ✅ Logs werden lokal gespeichert
4. ✅ Automatischer Sync bei Reconnect
5. ✅ Keine Duplikate nach Sync
6. ✅ Pending-Counter UI vorhanden
7. ✅ Counter geht nach Sync auf 0

---

## Milestone 6: Athlet UI & Polish 🏗️ IN PROGRESS

**Ziel:** MVP-Fertigstellung mit funktionierender Athleten-Session-Ausführung.

### Phase 6.1: Session-Ausführung ✅ DONE

- [x] `/session/[id]` Route für aktive Session
- [x] Session-Header mit Fortschrittsanzeige
- [x] Block-für-Block Navigation
- [x] Übungs-Card mit:
  - Übungsname und Bild
  - Prescription (Sets × Reps @ Gewicht)
  - RIR-Vorgabe
- [x] Set-Logger Inline-Formular:
  - Reps-Input (numpad-optimiert)
  - Gewicht-Input (vorbefüllt mit letztem Wert)
  - Pain-Flag Toggle
  - ~~Quick-Notes Feld~~ (verschoben)
- [x] Set-Liste pro Übung (erledigt/ausstehend)
- [x] "Nächster Set" / "Nächste Übung" Navigation
- [x] Rest-Timer:
  - Countdown basierend auf Prescription
  - Pause/Skip/Add Time Controls
  - Vibration bei Ende (falls unterstützt)
- [x] Offline-Status Anzeige

### Phase 6.2: Session-Management ✅ DONE

- [x] Session starten (started_at setzen) — auto beim Öffnen
- [x] Session abschließen (completed_at setzen) — „Training beenden"-Button
- [x] Zusammenfassung nach Session (`/session/[id]/summary`):
  - Gesamtvolumen
  - Dauer
  - Abgeschlossene Sets vs. Ziel
  - Pro-Übung Breakdown mit Schmerz-Flags

### Phase 6.3: Historie & Feedback

- [ ] Letzte Logs pro Übung anzeigen (während Session)
- [ ] Einfache Workout-Historie auf Dashboard
- [ ] Erfolgs-Toast nach jedem Set

### Phase 6.4: Polish & QA

- [ ] Loading States für alle Aktionen
- [ ] Error Boundaries
- [ ] iPhone Safari Optimierung
- [ ] Android Chrome Test
- [ ] Touch Feedback verbessern
- [ ] Performance Check

### Akzeptanzkriterien Milestone 6

1. Athlet kann Session öffnen und Sets loggen
2. Set-Logging in < 5 Sekunden möglich
3. Timer funktioniert während Pausen
4. Offline-Logging funktioniert nahtlos
5. Session kann abgeschlossen werden
6. Funktioniert auf iOS Safari und Android Chrome

---

## Post-MVP Roadmap (Future)

### Phase 7: Analytics & Progression

- [ ] Personal Best Erkennung und Anzeige
- [ ] Streak-Counter auf Dashboard
- [ ] Trainingsvolumen-Tracking
- [ ] Übungshistorie mit Graphen
- [ ] Coach Analytics Dashboard

### Phase 8: Erweiterungen

- [ ] Variable Meso-Länge
- [ ] Template-System für Mesos
- [ ] Export-Funktionen (CSV, PDF)
- [ ] Push Notifications
- [ ] Multi-Trainer Support
- [ ] Bild-Upload zu Storage

### Phase 9: Tests & Messungen

- [ ] Test-Typen definieren (Sprint, Sprung, etc.)
- [ ] Test-Eingabe für Athleten
- [ ] Test-Historie und Trends
- [ ] Verknüpfung mit Training

### Phase 10: Erweiterte Features

- [ ] RPE statt/zusätzlich zu RIR
- [ ] Tempo-Spezifikationen
- [ ] Auto-Progression Logik
- [ ] Video-Analyse Integration
- [ ] Erweiterte Gamification

---

## Changelog

| Datum | Änderung |
|-------|----------|
| 2026-04-21 | **Milestone 6 Phase 6.2 Complete**: Session-Summary-Page (`/session/[id]/summary`) mit Volumen, Dauer, Sätze pro Übung, Pain-Flag-Übersicht |
| 2026-01-05 | **Milestone 6 Phase 6.1 Complete**: Session-Ausführungs-UI mit Set-Logger, Rest-Timer, Block-Navigation |
| 2026-01-05 | ROADMAP aktualisiert: Milestone 1-3, 5 als complete markiert. Milestone 4 als partial. Neuer Milestone 6 Fokus auf Athlet-UI. |
| 2026-01-05 | Athleten-System neu designed (separate athletes Tabelle) |
| 2026-01-05 | Google OAuth hinzugefügt |
| 2026-01-05 | Übungs-Detail-Seite mit Edit/Varianten implementiert |
