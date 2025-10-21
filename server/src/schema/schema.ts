import { pgTable, text, timestamp, uuid, varchar, integer, primaryKey } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Korisnici - Povezujemo se s Firebase Auth putem ID-a
export const users = pgTable('users', {
  id: text('id').primaryKey(), // Firebase UID je string
  email: text('email').notNull().unique(),
  displayName: text('display_name'),
  avatarUrl: text('avatar_url'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

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
});

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
});

// Lokacije
export const locations = pgTable('locations', {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 256 }).notNull(),
    description: text('description'),
    projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
});

// Scene
export const scenes = pgTable('scenes', {
    id: uuid('id').primaryKey().defaultRandom(),
    title: varchar('title', { length: 256 }).notNull(),
    summary: text('summary'),
    order: integer('order').notNull().default(0),
    projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
    locationId: uuid('location_id').references(() => locations.id),
});



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

