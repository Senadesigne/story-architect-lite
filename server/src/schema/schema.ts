import { pgTable, text, timestamp, uuid, varchar, integer, index, customType, jsonb } from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';

// Korisnici - Povezujemo se s Firebase Auth putem ID-a
export const users = pgTable('users', {
  id: text('id').primaryKey(), // Firebase UID je string
  email: text('email').notNull().unique(),
  displayName: text('display_name'),
  avatarUrl: text('avatar_url'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  // Indeks za brže pretraživanje po email adresi
  emailIdx: index('idx_users_email').on(table.email),
}));

// Projekti - Glavni kontejner za priču
export const projects = pgTable('projects', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: varchar('title', { length: 256 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  
  // Faza 1: Ideja i Koncept
  logline: text('logline'),
  premise: text('premise'),
  theme: text('theme'),
  genre: text('genre'),
  audience: text('audience'),
  
  // Faza 2: Planiranje i Istraživanje
  brainstorming: text('brainstorming'),
  research: text('research'),
  
  // Faza 3: Izgradnja Svijeta
  rules_definition: text('rules_definition'),
  culture_and_history: text('culture_and_history'),
  
  // Faza 5: Strukturiranje Radnje
  synopsis: text('synopsis'),
  outline_notes: text('outline_notes'),
  
  // Faza 6: Završne Pripreme
  point_of_view: text('point_of_view'),
}, (table) => ({
  // Indeks za brže dohvaćanje projekata po korisniku
  userIdIdx: index('idx_projects_user_id').on(table.userId),
}));

// Likovi
export const characters = pgTable('characters', {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 256 }).notNull(),
    role: text('role'),
    motivation: text('motivation'),
    goal: text('goal'),
    fear: text('fear'),
    backstory: text('backstory'),
    arcStart: text('arc_start'),
    arcEnd: text('arc_end'),
    projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
}, (table) => ({
  // Indeks za brže dohvaćanje likova po projektu
  projectIdIdx: index('idx_characters_project_id').on(table.projectId),
}));

// Lokacije
export const locations = pgTable('locations', {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 256 }).notNull(),
    description: text('description'),
    projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
}, (table) => ({
  // Indeks za brže dohvaćanje lokacija po projektu
  projectIdIdx: index('idx_locations_project_id').on(table.projectId),
}));

// Scene
export const scenes = pgTable('scenes', {
    id: uuid('id').primaryKey().defaultRandom(),
    title: varchar('title', { length: 256 }).notNull(),
    summary: text('summary'),
    order: integer('order').notNull().default(0),
    projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
    locationId: uuid('location_id').references(() => locations.id),
}, (table) => ({
  // Indeks za brže dohvaćanje scena po projektu
  projectIdIdx: index('idx_scenes_project_id').on(table.projectId),
  // Kompozitni indeks za sortiranje scena po redoslijed unutar projekta
  orderIdx: index('idx_scenes_order').on(table.projectId, table.order),
  // Indeks za brže dohvaćanje scena po lokaciji
  locationIdIdx: index('idx_scenes_location_id').on(table.locationId),
}));



// DEFINIRANJE RELACIJA (kako Drizzle razumije veze)

export const usersRelations = relations(users, ({ many }) => ({
    projects: many(projects),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
    user: one(users, { fields: [projects.userId], references: [users.id] }),
    characters: many(characters),
    locations: many(locations),
    scenes: many(scenes),
}));

export const charactersRelations = relations(characters, ({ one }) => ({
    project: one(projects, { fields: [characters.projectId], references: [projects.id] }),
}));

export const locationsRelations = relations(locations, ({ one, many }) => ({
    project: one(projects, { fields: [locations.projectId], references: [projects.id] }),
    scenes: many(scenes),
}));

export const scenesRelations = relations(scenes, ({ one }) => ({
    project: one(projects, { fields: [scenes.projectId], references: [projects.id] }),
    location: one(locations, { fields: [scenes.locationId], references: [locations.id] }),
}));

// Custom type za pgvector - sigurna implementacija
export const vector = customType<{ data: number[]; driverData: string }>({
  dataType() { 
    return 'vector(1536)'; // OpenAI text-embedding-3-small koristi 1536 dimenzija
  },
  toDriver(value: number[]): string {
    // Pretvori array brojeva u PostgreSQL vector format
    // pgvector koristi format: [1,2,3,...]
    return `[${value.join(',')}]`;
  },
  fromDriver(value: string): number[] {
    // Pretvori PostgreSQL vector string natrag u array
    // Format iz pgvector: [1,2,3,...] ili (1,2,3,...)
    const cleanValue = value.replace(/^\[|\]$/g, '').replace(/^\(|\)$/g, '');
    return cleanValue.split(',').map(v => parseFloat(v.trim()));
  },
});

// Tablica za AI vektorske embeddings
export const storyArchitectEmbeddings = pgTable('story_architect_embeddings', {
  id: uuid('id').primaryKey().defaultRandom(),
  content: text('content').notNull(),
  metadata: jsonb('metadata').default({}).$type<{
    docId?: string;
    projectId?: string;
    chunkIndex?: number;
    sourceType?: 'character' | 'scene' | 'location' | 'project';
    [key: string]: any;
  }>(),
  vector: vector('vector').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  // Vektorski indeks se kreira putem create-vector-indexes.ts skripte (IVFFLAT tip)
  // vectorIdx: index('idx_story_architect_embeddings_vector').on(table.vector),
  // JSON indeks se kreira ručno u create-vector-indexes.ts zbog Drizzle limitacija
  // metadataProjectIdIdx: index('idx_embeddings_metadata_project_id').on(sql`(metadata->>'projectId')`),
  createdAtIdx: index('idx_embeddings_created_at').on(table.createdAt),
}));

// Relacije za embeddings tablicu
export const storyArchitectEmbeddingsRelations = relations(storyArchitectEmbeddings, ({ }) => ({
  // Embeddings tablica nema direktne FK veze, koristi metadata za reference
}));

