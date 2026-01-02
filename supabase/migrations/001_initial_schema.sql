-- Training App Initial Schema
-- Requires Supabase with Auth enabled

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- PROFILES TABLE
-- ============================================
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('trainer', 'athlete')),
    name TEXT NOT NULL,
    trainer_id UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Index for role-based queries
CREATE INDEX idx_profiles_role ON profiles(role);
-- Index for trainer's athletes lookup
CREATE INDEX idx_profiles_trainer_id ON profiles(trainer_id);

-- ============================================
-- INVITES TABLE
-- ============================================
CREATE TABLE invites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL DEFAULT 'athlete' CHECK (role IN ('trainer', 'athlete')),
    athlete_name TEXT,
    created_by UUID NOT NULL REFERENCES profiles(id),
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    used_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Index for code lookup
CREATE INDEX idx_invites_code ON invites(code);
-- Index for trainer's invites
CREATE INDEX idx_invites_created_by ON invites(created_by);

-- ============================================
-- EXERCISES TABLE
-- ============================================
CREATE TABLE exercises (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    parent_exercise_id UUID REFERENCES exercises(id) ON DELETE SET NULL,
    image_url TEXT NOT NULL,
    video_url TEXT,
    categories TEXT[] DEFAULT '{}',
    muscle_groups TEXT[] DEFAULT '{}',
    equipment TEXT[] DEFAULT '{}',
    description TEXT,
    purpose_note TEXT,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Index for parent exercise lookup (variants)
CREATE INDEX idx_exercises_parent ON exercises(parent_exercise_id);
-- Index for name search
CREATE INDEX idx_exercises_name ON exercises(name);

-- ============================================
-- MESOCYCLES TABLE
-- ============================================
CREATE TABLE mesocycles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    athlete_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    phase TEXT,
    start_date DATE,
    duration_weeks INT DEFAULT 4 NOT NULL,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed')),
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Index for athlete's mesocycles
CREATE INDEX idx_mesocycles_athlete ON mesocycles(athlete_id);
-- Index for status filtering
CREATE INDEX idx_mesocycles_status ON mesocycles(status);

-- ============================================
-- SESSIONS TABLE
-- ============================================
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mesocycle_id UUID NOT NULL REFERENCES mesocycles(id) ON DELETE CASCADE,
    week_number INT NOT NULL,
    day_of_week INT CHECK (day_of_week >= 1 AND day_of_week <= 7),
    name TEXT,
    order_index INT NOT NULL,
    notes TEXT,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Index for mesocycle's sessions
CREATE INDEX idx_sessions_mesocycle ON sessions(mesocycle_id);
-- Composite index for week queries
CREATE INDEX idx_sessions_week ON sessions(mesocycle_id, week_number);

-- ============================================
-- SESSION_BLOCKS TABLE
-- ============================================
CREATE TABLE session_blocks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    block_type TEXT NOT NULL CHECK (block_type IN ('single', 'superset', 'cluster')),
    order_index INT NOT NULL,
    rest_between_rounds INT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Index for session's blocks
CREATE INDEX idx_blocks_session ON session_blocks(session_id);

-- ============================================
-- PLANNED_EXERCISES TABLE
-- ============================================
CREATE TABLE planned_exercises (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    block_id UUID NOT NULL REFERENCES session_blocks(id) ON DELETE CASCADE,
    exercise_id UUID NOT NULL REFERENCES exercises(id),
    order_in_block INT NOT NULL,
    sets_target INT NOT NULL,
    reps_target TEXT NOT NULL,
    weight_prescribed DECIMAL(6,2),
    rir INT,
    rest_time_default INT DEFAULT 120,
    notes TEXT,
    cluster_reps INT,
    cluster_count INT,
    intra_cluster_rest INT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Index for block's exercises
CREATE INDEX idx_planned_exercise_block ON planned_exercises(block_id);
-- Index for exercise lookup
CREATE INDEX idx_planned_exercise_exercise ON planned_exercises(exercise_id);

-- ============================================
-- SET_LOGS TABLE
-- ============================================
CREATE TABLE set_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    planned_exercise_id UUID NOT NULL REFERENCES planned_exercises(id),
    athlete_id UUID NOT NULL REFERENCES profiles(id),
    set_number INT NOT NULL,
    reps_completed INT NOT NULL,
    weight_used DECIMAL(6,2),
    pain_flag BOOLEAN DEFAULT FALSE,
    notes TEXT,
    client_uuid UUID UNIQUE NOT NULL,
    logged_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    synced_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Index for planned exercise's logs
CREATE INDEX idx_setlogs_planned_exercise ON set_logs(planned_exercise_id);
-- Index for athlete's logs
CREATE INDEX idx_setlogs_athlete ON set_logs(athlete_id);
-- Composite index for athlete + date queries
CREATE INDEX idx_setlogs_athlete_date ON set_logs(athlete_id, logged_at);
-- Unique index for offline deduplication
CREATE UNIQUE INDEX idx_setlogs_client_uuid ON set_logs(client_uuid);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at trigger to relevant tables
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_exercises_updated_at
    BEFORE UPDATE ON exercises
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_mesocycles_updated_at
    BEFORE UPDATE ON mesocycles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO profiles (id, role, name, trainer_id)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'role', 'athlete'),
        COALESCE(NEW.raw_user_meta_data->>'name', 'Neuer Nutzer'),
        NULL
    );
    RETURN NEW;
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- Trigger to create profile on signup
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE mesocycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE planned_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE set_logs ENABLE ROW LEVEL SECURITY;

-- PROFILES POLICIES
CREATE POLICY "Users can view own profile"
    ON profiles FOR SELECT
    USING (id = auth.uid());

CREATE POLICY "Trainers can view all profiles"
    ON profiles FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'trainer'
        )
    );

CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE
    USING (id = auth.uid());

-- INVITES POLICIES
CREATE POLICY "Trainers can create invites"
    ON invites FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'trainer'
        )
    );

CREATE POLICY "Anyone can read invites for validation"
    ON invites FOR SELECT
    USING (true);

CREATE POLICY "System can update invites"
    ON invites FOR UPDATE
    USING (true);

-- EXERCISES POLICIES
CREATE POLICY "Authenticated users can view exercises"
    ON exercises FOR SELECT
    USING (auth.uid() IS NOT NULL);

CREATE POLICY "Trainers can insert exercises"
    ON exercises FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'trainer'
        )
    );

CREATE POLICY "Trainers can update exercises"
    ON exercises FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'trainer'
        )
    );

CREATE POLICY "Trainers can delete exercises"
    ON exercises FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'trainer'
        )
    );

-- MESOCYCLES POLICIES
CREATE POLICY "Athletes can view own mesocycles"
    ON mesocycles FOR SELECT
    USING (athlete_id = auth.uid());

CREATE POLICY "Trainers can view all mesocycles"
    ON mesocycles FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'trainer'
        )
    );

CREATE POLICY "Trainers can insert mesocycles"
    ON mesocycles FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'trainer'
        )
    );

CREATE POLICY "Trainers can update mesocycles"
    ON mesocycles FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'trainer'
        )
    );

CREATE POLICY "Trainers can delete mesocycles"
    ON mesocycles FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'trainer'
        )
    );

-- SESSIONS POLICIES
CREATE POLICY "Athletes can view sessions of own mesocycles"
    ON sessions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM mesocycles
            WHERE mesocycles.id = sessions.mesocycle_id
            AND mesocycles.athlete_id = auth.uid()
        )
    );

CREATE POLICY "Trainers can manage sessions"
    ON sessions FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'trainer'
        )
    );

CREATE POLICY "Athletes can update own sessions"
    ON sessions FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM mesocycles
            WHERE mesocycles.id = sessions.mesocycle_id
            AND mesocycles.athlete_id = auth.uid()
        )
    );

-- SESSION_BLOCKS POLICIES
CREATE POLICY "Users can view blocks of accessible sessions"
    ON session_blocks FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM sessions
            JOIN mesocycles ON mesocycles.id = sessions.mesocycle_id
            WHERE sessions.id = session_blocks.session_id
            AND (
                mesocycles.athlete_id = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM profiles
                    WHERE id = auth.uid() AND role = 'trainer'
                )
            )
        )
    );

CREATE POLICY "Trainers can manage blocks"
    ON session_blocks FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'trainer'
        )
    );

-- PLANNED_EXERCISES POLICIES
CREATE POLICY "Users can view planned exercises of accessible blocks"
    ON planned_exercises FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM session_blocks
            JOIN sessions ON sessions.id = session_blocks.session_id
            JOIN mesocycles ON mesocycles.id = sessions.mesocycle_id
            WHERE session_blocks.id = planned_exercises.block_id
            AND (
                mesocycles.athlete_id = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM profiles
                    WHERE id = auth.uid() AND role = 'trainer'
                )
            )
        )
    );

CREATE POLICY "Trainers can manage planned exercises"
    ON planned_exercises FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'trainer'
        )
    );

-- SET_LOGS POLICIES
CREATE POLICY "Athletes can view own logs"
    ON set_logs FOR SELECT
    USING (athlete_id = auth.uid());

CREATE POLICY "Trainers can view all logs"
    ON set_logs FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'trainer'
        )
    );

CREATE POLICY "Athletes can insert own logs"
    ON set_logs FOR INSERT
    WITH CHECK (athlete_id = auth.uid());

CREATE POLICY "Athletes can update own logs"
    ON set_logs FOR UPDATE
    USING (athlete_id = auth.uid());

-- ============================================
-- STORAGE BUCKET
-- ============================================
-- Run this in Supabase Dashboard -> Storage -> Create Bucket
-- Bucket name: exercises
-- Public: true (or use signed URLs)

-- Storage policy for exercises bucket (run in SQL editor):
-- INSERT INTO storage.buckets (id, name, public) VALUES ('exercises', 'exercises', true);

-- CREATE POLICY "Trainers can upload exercise images"
-- ON storage.objects FOR INSERT
-- WITH CHECK (
--     bucket_id = 'exercises'
--     AND EXISTS (
--         SELECT 1 FROM profiles
--         WHERE id = auth.uid() AND role = 'trainer'
--     )
-- );

-- CREATE POLICY "Anyone can view exercise images"
-- ON storage.objects FOR SELECT
-- USING (bucket_id = 'exercises');
