# Training-App - Datenmodell

## Entity Relationship Diagram (Text)

```
profiles (1) ──────┬───────── (n) invites
    │              │
    │ trainer_id   │ created_by
    │              │
    ▼              │
athletes ─────────►│
    │
    │ athlete_id
    ▼
mesocycles (1) ────────── (n) sessions (1) ────── (n) session_blocks
                                                          │
                                                          │ block_id
                                                          ▼
                                               planned_exercises (1) ── (n) set_logs
                                                          │
                                                          │ exercise_id
                                                          ▼
                                                     exercises
                                                          │
                                                          │ parent_exercise_id
                                                          ▼
                                                     (self-reference)
```

## Tabellen-Definitionen

### profiles

Erweitert Supabase Auth Users mit App-spezifischen Daten.

| Feld | Typ | Constraints | Beschreibung |
|------|-----|-------------|--------------|
| id | UUID | PK, FK → auth.users | User ID |
| role | TEXT | NOT NULL, CHECK | 'trainer' oder 'athlete' |
| name | TEXT | NOT NULL | Anzeigename |
| trainer_id | UUID | FK → profiles | Zugewiesener Trainer (für Athleten) |
| created_at | TIMESTAMPTZ | DEFAULT now() | Erstellzeitpunkt |
| updated_at | TIMESTAMPTZ | DEFAULT now() | Letzte Änderung |

**Indexes:**
- `idx_profiles_role` auf `role`
- `idx_profiles_trainer_id` auf `trainer_id`

---

### invites

Einladungscodes für Athlete-Registrierung.

| Feld | Typ | Constraints | Beschreibung |
|------|-----|-------------|--------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | |
| code | TEXT | UNIQUE, NOT NULL | 8-Zeichen Code |
| role | TEXT | NOT NULL, DEFAULT 'athlete' | Zielrolle |
| athlete_name | TEXT | | Vorgeschlagener Name |
| created_by | UUID | FK → profiles, NOT NULL | Ersteller (Trainer) |
| expires_at | TIMESTAMPTZ | NOT NULL | Ablaufdatum |
| used_at | TIMESTAMPTZ | | Verwendungszeitpunkt |
| used_by | UUID | FK → profiles | Wer hat verwendet |
| created_at | TIMESTAMPTZ | DEFAULT now() | |

**Indexes:**
- `idx_invites_code` auf `code`
- `idx_invites_created_by` auf `created_by`

---

### exercises

Übungsdatenbank mit Varianten-Hierarchie.

| Feld | Typ | Constraints | Beschreibung |
|------|-----|-------------|--------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | |
| name | TEXT | NOT NULL | Übungsname |
| parent_exercise_id | UUID | FK → exercises | Parent für Varianten |
| image_url | TEXT | NOT NULL | Pflichtbild |
| video_url | TEXT | | Optional Video-Link |
| categories | TEXT[] | | z.B. ['Beine', 'Compound'] |
| muscle_groups | TEXT[] | | z.B. ['Quadrizeps', 'Gluteus'] |
| equipment | TEXT[] | | z.B. ['Langhantel', 'Rack'] |
| description | TEXT | | Ausführungsbeschreibung |
| purpose_note | TEXT | | Warum diese Übung? |
| created_by | UUID | FK → profiles | Ersteller |
| created_at | TIMESTAMPTZ | DEFAULT now() | |
| updated_at | TIMESTAMPTZ | DEFAULT now() | |

**Indexes:**
- `idx_exercises_parent` auf `parent_exercise_id`
- `idx_exercises_name` auf `name` (für Suche)

---

### mesocycles

Trainingszyklen (typisch 4 Wochen).

| Feld | Typ | Constraints | Beschreibung |
|------|-----|-------------|--------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | |
| athlete_id | UUID | FK → profiles, NOT NULL | Zugewiesener Athlet |
| name | TEXT | NOT NULL | z.B. "Hypertrophie Block 1" |
| phase | TEXT | | z.B. 'accumulation', 'deload' |
| start_date | DATE | | Startdatum |
| duration_weeks | INT | DEFAULT 4 | Dauer in Wochen |
| status | TEXT | DEFAULT 'active' | 'draft', 'active', 'completed' |
| created_by | UUID | FK → profiles | Trainer |
| created_at | TIMESTAMPTZ | DEFAULT now() | |
| updated_at | TIMESTAMPTZ | DEFAULT now() | |

**Indexes:**
- `idx_mesocycles_athlete` auf `athlete_id`
- `idx_mesocycles_status` auf `status`

---

### sessions

Einzelne Trainingseinheiten innerhalb eines Meso.

| Feld | Typ | Constraints | Beschreibung |
|------|-----|-------------|--------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | |
| mesocycle_id | UUID | FK → mesocycles, NOT NULL | Zugehöriger Meso |
| week_number | INT | NOT NULL | Woche 1-4 (oder mehr) |
| day_of_week | INT | | 1-7 (Montag-Sonntag) |
| name | TEXT | | z.B. "Push Day" |
| order_index | INT | NOT NULL | Reihenfolge in der Woche |
| notes | TEXT | | Trainer-Notizen |
| started_at | TIMESTAMPTZ | | Wann begonnen |
| completed_at | TIMESTAMPTZ | | Wann abgeschlossen |
| created_at | TIMESTAMPTZ | DEFAULT now() | |

**Indexes:**
- `idx_sessions_mesocycle` auf `mesocycle_id`
- `idx_sessions_week` auf `(mesocycle_id, week_number)`

---

### session_blocks

Container für Übungsgruppierungen (Single, Superset, Cluster).

| Feld | Typ | Constraints | Beschreibung |
|------|-----|-------------|--------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | |
| session_id | UUID | FK → sessions, NOT NULL | Zugehörige Session |
| block_type | TEXT | NOT NULL, CHECK | 'single', 'superset', 'cluster' |
| order_index | INT | NOT NULL | Reihenfolge im Training |
| rest_between_rounds | INT | | Pause zwischen Runden (Sek) |
| notes | TEXT | | Block-Notizen |
| created_at | TIMESTAMPTZ | DEFAULT now() | |

**Indexes:**
- `idx_blocks_session` auf `session_id`

**CHECK Constraint:**
```sql
block_type IN ('single', 'superset', 'cluster')
```

---

### planned_exercises

Geplante Übungen mit Prescription.

| Feld | Typ | Constraints | Beschreibung |
|------|-----|-------------|--------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | |
| block_id | UUID | FK → session_blocks, NOT NULL | Zugehöriger Block |
| exercise_id | UUID | FK → exercises, NOT NULL | Übung |
| order_in_block | INT | NOT NULL | Reihenfolge im Block |
| sets_target | INT | NOT NULL | Anzahl Sets |
| reps_target | TEXT | NOT NULL | z.B. "8-12" oder "5" |
| weight_prescribed | DECIMAL(6,2) | | Vorgabe-Gewicht (kg) |
| rir | INT | | Reps in Reserve (Trainer-Vorgabe) |
| rest_time_default | INT | DEFAULT 120 | Standard-Pause (Sek) |
| notes | TEXT | | Übungsspezifische Notizen |
| cluster_reps | INT | | Für Cluster: Reps pro Mini-Set |
| cluster_count | INT | | Für Cluster: Anzahl Mini-Sets |
| intra_cluster_rest | INT | | Pause innerhalb Cluster (Sek) |
| created_at | TIMESTAMPTZ | DEFAULT now() | |

**Indexes:**
- `idx_planned_exercise_block` auf `block_id`
- `idx_planned_exercise_exercise` auf `exercise_id`

---

### set_logs

Geloggte Sets der Athleten.

| Feld | Typ | Constraints | Beschreibung |
|------|-----|-------------|--------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | |
| planned_exercise_id | UUID | FK → planned_exercises, NOT NULL | Geplante Übung |
| athlete_id | UUID | FK → profiles, NOT NULL | Athlet |
| set_number | INT | NOT NULL | Set-Nummer (1, 2, 3...) |
| reps_completed | INT | NOT NULL | Geschaffte Wiederholungen |
| weight_used | DECIMAL(6,2) | | Verwendetes Gewicht |
| pain_flag | BOOLEAN | DEFAULT false | Schmerz-Marker |
| notes | TEXT | | Set-Notizen |
| client_uuid | UUID | UNIQUE, NOT NULL | Offline-Dedup-Key |
| logged_at | TIMESTAMPTZ | DEFAULT now() | Zeitpunkt |
| synced_at | TIMESTAMPTZ | | Server-Sync-Zeit |
| created_at | TIMESTAMPTZ | DEFAULT now() | |

**Indexes:**
- `idx_setlogs_planned_exercise` auf `planned_exercise_id`
- `idx_setlogs_athlete` auf `athlete_id`
- `idx_setlogs_athlete_date` auf `(athlete_id, logged_at)`
- `idx_setlogs_client_uuid` auf `client_uuid` (UNIQUE)

---

## RLS Policies

### profiles

```sql
-- Jeder sieht sein eigenes Profil
CREATE POLICY "Users can view own profile"
ON profiles FOR SELECT
USING (id = auth.uid());

-- Trainer sehen alle Profile
CREATE POLICY "Trainers can view all profiles"
ON profiles FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'trainer'
  )
);

-- Nur eigenes Profil bearbeiten
CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
USING (id = auth.uid());
```

### invites

```sql
-- Nur Trainer können Invites erstellen
CREATE POLICY "Trainers can create invites"
ON invites FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'trainer'
  )
);

-- Öffentlich lesbar für Validierung (nur Code-Check)
CREATE POLICY "Anyone can validate invite codes"
ON invites FOR SELECT
USING (true);
```

### exercises

```sql
-- Alle authentifizierten User können Übungen lesen
CREATE POLICY "Authenticated users can view exercises"
ON exercises FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Nur Trainer können Übungen erstellen/bearbeiten
CREATE POLICY "Trainers can manage exercises"
ON exercises FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'trainer'
  )
);
```

### mesocycles

```sql
-- Athleten sehen ihre eigenen Mesos
CREATE POLICY "Athletes can view own mesocycles"
ON mesocycles FOR SELECT
USING (athlete_id = auth.uid());

-- Trainer sehen und verwalten alle Mesos
CREATE POLICY "Trainers can manage mesocycles"
ON mesocycles FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'trainer'
  )
);
```

### set_logs

```sql
-- Athleten können eigene Logs lesen
CREATE POLICY "Athletes can view own logs"
ON set_logs FOR SELECT
USING (athlete_id = auth.uid());

-- Athleten können eigene Logs erstellen
CREATE POLICY "Athletes can create own logs"
ON set_logs FOR INSERT
WITH CHECK (athlete_id = auth.uid());

-- Trainer sehen alle Logs
CREATE POLICY "Trainers can view all logs"
ON set_logs FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'trainer'
  )
);
```

## Konflikt-Strategie (Offline Sync)

### set_logs

- **Strategie**: Append-only mit Deduplizierung
- `client_uuid` ist UNIQUE Constraint
- Insert mit `ON CONFLICT (client_uuid) DO NOTHING`
- Kein echter Konflikt möglich, da jeder Log einzigartig

### Andere Tabellen

- Trainer-only → Online-only → kein Offline-Konflikt
- Sessions: `started_at`/`completed_at` → Last-Write-Wins

## Seed-Daten (für Dev/Demo)

### Basis-Übungen

```sql
INSERT INTO exercises (name, categories, muscle_groups, equipment, image_url) VALUES
('Kniebeuge', ARRAY['Beine', 'Compound'], ARRAY['Quadrizeps', 'Gluteus'], ARRAY['Langhantel', 'Rack'], '/seed/squat.jpg'),
('Bankdrücken', ARRAY['Oberkörper', 'Compound'], ARRAY['Brust', 'Trizeps'], ARRAY['Langhantel', 'Bank'], '/seed/bench.jpg'),
('Kreuzheben', ARRAY['Rücken', 'Compound'], ARRAY['Unterer Rücken', 'Hamstrings'], ARRAY['Langhantel'], '/seed/deadlift.jpg'),
-- ... weitere
```
