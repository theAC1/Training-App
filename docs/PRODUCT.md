# Training-App - Produktdokumentation

## Überblick

Mobile-first WebApp für Krafttraining im Leichtathletik-Verein. Inspiriert von der UX von RP Strength mit Fokus auf extrem schnelles Logging während des Trainings.

## Zielgruppe

- **Athleten**: 3-8 Vereinsmitglieder
- **Trainer**: 1 Coach (MVP)

## Kernprinzipien

### UX-Prinzipien

1. **Schnelles Logging**: Pro Set < 5 Sekunden möglich
2. **Minimale Eingaben**: Nur Wiederholungen sind Pflicht
3. **Touch-Optimiert**: Mindestens 48x48px Touch Targets
4. **Dark Mode Default**: Augenschonend im Gym
5. **Offline First**: Kein Datenverlust bei schlechtem Empfang
6. **Klares Feedback**: Visuelle Bestätigung nach jedem Save

### Design-Entscheidungen

- Cards statt Tabellen (kein Horizontal-Scroll auf Mobile)
- Große Buttons für häufige Aktionen
- Vorbefüllte Werte wo möglich
- Timer ist Hilfe, keine Pflicht

## User Flows

### 1. Onboarding (Athlet)

```
Athlet erhält Invite-Code vom Coach
    → Öffnet App
    → Gibt Invite-Code ein
    → Wählt Namen (falls nicht vorgegeben)
    → Setzt Passwort
    → Login → Dashboard
```

### 2. Trainer: Übung anlegen

```
Trainer → Übungen
    → "Neue Übung"
    → Name, Kategorie, Muskelgruppen eingeben
    → Bild hochladen (Pflicht)
    → Optional: Video-URL
    → Speichern
    → Optional: Variante hinzufügen (Parent wählen)
```

### 3. Trainer: Mesozyklus planen

```
Trainer → Planung → "Neuer Meso"
    → Name eingeben
    → Athlet zuweisen
    → Start-Datum (optional)
    → Wochen-Struktur: 3 Aufbau + 1 Deload (Default)
    → Sessions anlegen pro Woche
    → Übungen zu Sessions hinzufügen
    → Sets, Gewicht, RIR, Pause vorgeben
```

### 4. Athlet: Training loggen

```
Athlet → Dashboard
    → Aktuelle Session wählen
    → Übung 1 anzeigen
        → Set 1: Reps eingeben (Gewicht vorbefüllt)
        → Optional: Gewicht anpassen
        → Optional: Pain Flag setzen
        → Auto-Save
        → Timer startet automatisch (wenn aktiv)
    → Nächster Set oder nächste Übung
    → Session abschließen
```

### 5. Athlet: Historie ansehen

```
Athlet → Übung antippen
    → Letzte Logs dieser Übung
    → Personal Bests anzeigen
    → Trend-Indikator (einfach)
```

## Route Map

```
/                       → Redirect zu /login oder /dashboard
/login                  → Login-Formular
/signup                 → Signup mit Invite-Code
/dashboard              → Athlet: Sessions, PBs, Streaks
                        → Trainer: Quick Stats, Navigation

/session/[id]           → Aktive Session (Athlet)
/session/[id]/log       → Set-Logging View

/exercises              → Übungsliste (Athlet: readonly, Trainer: CRUD)
/exercises/[id]         → Übungsdetail mit Historie
/exercises/new          → Neue Übung (Trainer only)
/exercises/[id]/edit    → Übung bearbeiten (Trainer only)

/plan                   → Meso-Übersicht (Trainer)
/plan/new               → Neuer Mesozyklus
/plan/[id]              → Meso-Detail
/plan/[id]/session/[sid]→ Session bearbeiten

/athletes               → Athletenverwaltung (Trainer only)
/athletes/[id]          → Athleten-Detail, zugewiesene Pläne

/settings               → App-Einstellungen, Theme Toggle
```

## Komponenten-Übersicht

### Layout

- `RootLayout`: HTML, Fonts, Theme Provider
- `AuthLayout`: Für Login/Signup Seiten
- `AppLayout`: Mit Navigation, Header
- `BottomNav`: Mobile Navigation (4-5 Items)

### Gemeinsam

- `Button`: Primary, Secondary, Ghost, Danger
- `Input`: Text, Number (optimiert für Ziffern)
- `Card`: Container mit optionalem Header
- `Badge`: Status, Kategorien
- `Toast`: Feedback-Nachrichten
- `Dialog`: Modale Dialoge
- `Checkbox`: Pain Flag, Optionen

### Training-spezifisch

- `SessionCard`: Session-Vorschau mit Status
- `ExerciseCard`: Übung mit Bild, Prescription
- `SetLogger`: Kompakte Set-Eingabe
- `RestTimer`: Countdown mit Vibrationsalarm
- `PainFlag`: Checkbox für Schmerz-Dokumentation
- `PBBadge`: Personal Best Anzeige

### Daten-Anzeige

- `ExerciseHistory`: Liste vergangener Logs
- `StreakCounter`: Trainingsstreak-Anzeige
- `SyncIndicator`: Offline/Sync-Status

## Gamification (Minimal, MVP)

### Personal Bests

- Automatische Erkennung neuer PBs (Gewicht × Reps)
- Visuelle Hervorhebung beim Erreichen
- PB-Historie pro Übung

### Streaks

- Trainingstage in Folge (basierend auf abgeschlossenen Sessions)
- Einfacher Counter auf Dashboard
- Keine Leaderboards, nur eigene Daten

## Sprache

- **Nur Deutsch**
- Alle UI-Texte auf Deutsch
- Technische Begriffe: Reps, Sets, RIR bleiben

## Offline-Verhalten

### Was offline funktioniert

- Session-Liste und Details anzeigen
- Sets loggen (lokale Speicherung)
- Timer nutzen
- Pain Flag setzen

### Was online-only ist

- Trainer-Admin (Übungen, Pläne)
- Bild-Upload
- Account-Einstellungen

### Sync-Verhalten

- Automatischer Sync bei Reconnect
- "X Einträge warten auf Sync" Anzeige
- Konflikt-Strategie: Append-only für Logs
