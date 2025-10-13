-- SQL skripta za kreiranje potrebnih tablica
-- Pokreni ovo u PostgreSQL bazi na portu 5502

-- Korisnici
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE
);

-- Projekti
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(256) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    logline TEXT,
    premise TEXT,
    theme TEXT
);

-- Likovi
CREATE TABLE IF NOT EXISTS characters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(256) NOT NULL,
    role TEXT,
    motivation TEXT,
    arc_start TEXT,
    arc_end TEXT,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE
);

-- Lokacije
CREATE TABLE IF NOT EXISTS locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(256) NOT NULL,
    description TEXT,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE
);

-- Scene
CREATE TABLE IF NOT EXISTS scenes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(256) NOT NULL,
    summary TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    location_id UUID REFERENCES locations(id)
);

-- Vezna tablica: Likovi-Scene
CREATE TABLE IF NOT EXISTS characters_to_scenes (
    character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
    scene_id UUID NOT NULL REFERENCES scenes(id) ON DELETE CASCADE,
    PRIMARY KEY (character_id, scene_id)
);

-- Provjeri da su tablice stvorene
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
