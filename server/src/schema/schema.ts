import { pgTable, text, timestamp, uuid, varchar, integer, index, vector, jsonb } from 'drizzle-orm/pg-core';
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

  // Faza 0: Ideja Priče
  story_idea: text('story_idea'),

  // Faza 1: Ideja i Koncept

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

  // Beat Sheet Struktura (Dio Faze 5)
  beat_sheet_setup: text('beat_sheet_setup'),
  beat_sheet_inciting_incident: text('beat_sheet_inciting_incident'),
  beat_sheet_midpoint: text('beat_sheet_midpoint'),
  beat_sheet_climax: text('beat_sheet_climax'),
  beat_sheet_falling_action: text('beat_sheet_falling_action'),

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

// Poglavlja
export const chapters = pgTable('chapters', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: varchar('title', { length: 256 }).notNull(),
  phase: varchar('phase', { length: 50 }).notNull(), // 'setup', 'inciting_incident', etc.
  order: integer('order').notNull().default(0),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
}, (table) => ({
  // Indeks za brže dohvaćanje poglavlja po projektu
  projectIdIdx: index('idx_chapters_project_id').on(table.projectId),
  // Indeks za sortiranje poglavlja
  orderIdx: index('idx_chapters_order').on(table.projectId, table.order),
}));

// Scene
export const scenes = pgTable('scenes', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: varchar('title', { length: 256 }).notNull(),
  summary: text('summary'),
  order: integer('order').notNull().default(0),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  locationId: uuid('location_id').references(() => locations.id),
  chapterId: uuid('chapter_id').references(() => chapters.id, { onDelete: 'set null' }),
}, (table) => ({
  // Indeks za brže dohvaćanje scena po projektu
  projectIdIdx: index('idx_scenes_project_id').on(table.projectId),
  // Kompozitni indeks za sortiranje scena po redoslijed unutar projekta
  orderIdx: index('idx_scenes_order').on(table.projectId, table.order),
  // Indeks za brže dohvaćanje scena po lokaciji
  locationIdIdx: index('idx_scenes_location_id').on(table.locationId),
  // Indeks za brže dohvaćanje scena po poglavlju
  chapterIdIdx: index('idx_scenes_chapter_id').on(table.chapterId),
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
  chapters: many(chapters),
}));

export const chaptersRelations = relations(chapters, ({ one, many }) => ({
  project: one(projects, { fields: [chapters.projectId], references: [projects.id] }),
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
  chapter: one(chapters, { fields: [scenes.chapterId], references: [chapters.id] }),
}));


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
  vector: vector('vector', { dimensions: 1536 }).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  // Vektorski indeks za brzu pretragu sličnosti
  vectorIdx: index('idx_story_architect_embeddings_vector').using('hnsw', table.vector.op('vector_cosine_ops')),
  createdAtIdx: index('idx_embeddings_created_at').on(table.createdAt),
}));

// Relacije za embeddings tablicu
export const storyArchitectEmbeddingsRelations = relations(storyArchitectEmbeddings, ({ }) => ({
  // Embeddings tablica nema direktne FK veze, koristi metadata za reference
}));

// ------------------------------------------------------------------
// CHAT & SESSION MANAGEMENT
// ------------------------------------------------------------------

export const chatSessions = pgTable('chat_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  name: text('name').notNull(), // e.g. "Brainstorming 1"
  mode: text('mode').notNull(), // 'planner' or 'studio'
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('idx_chat_sessions_user_id').on(table.userId),
  projectIdIdx: index('idx_chat_sessions_project_id').on(table.projectId),
}));

export const chatMessages = pgTable('chat_messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id').notNull().references(() => chatSessions.id, { onDelete: 'cascade' }),
  role: text('role').notNull(), // 'user', 'assistant', 'system'
  content: text('content').notNull(),
  metadata: jsonb('metadata'), // For storing token usage, model used, etc.
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  sessionIdIdx: index('idx_chat_messages_session_id').on(table.sessionId),
}));

export const chatSessionsRelations = relations(chatSessions, ({ one, many }) => ({
  user: one(users, { fields: [chatSessions.userId], references: [users.id] }),
  project: one(projects, { fields: [chatSessions.projectId], references: [projects.id] }),
  messages: many(chatMessages),
}));

export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
  session: one(chatSessions, { fields: [chatMessages.sessionId], references: [chatSessions.id] }),
}));


export const editorAnalyses = pgTable('editor_analyses', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),

  // Upit koji je korisnik postavio (npr. "Analiziraj lik Marka")
  prompt: text('prompt').notNull(),

  // Generirani markdown odgovor od Gemini-ja
  content: text('content').notNull(),

  // Koji model je korišten (za buduću analitiku/naplatu)
  model: text('model').default('gemini-1.5-pro'),

  // Token usage (korisno za praćenje troškova)
  inputTokens: integer('input_tokens'),
  outputTokens: integer('output_tokens'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  projectIdIdx: index('idx_editor_analyses_project_id').on(table.projectId),
  userIdIdx: index('idx_editor_analyses_user_id').on(table.userId),
}));

export const editorAnalysesRelations = relations(editorAnalyses, ({ one }) => ({
  project: one(projects, { fields: [editorAnalyses.projectId], references: [projects.id] }),
  user: one(users, { fields: [editorAnalyses.userId], references: [users.id] }),
}));
