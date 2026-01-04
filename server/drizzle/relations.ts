import { relations } from "drizzle-orm/relations";
import { users, projects, characters, locations, scenes, chapters, chatSessions, chatMessages } from "./schema";

export const projectsRelations = relations(projects, ({one, many}) => ({
	user: one(users, {
		fields: [projects.userId],
		references: [users.id]
	}),
	characters: many(characters),
	locations: many(locations),
	scenes: many(scenes),
	chatSessions: many(chatSessions),
	chapters: many(chapters),
}));

export const usersRelations = relations(users, ({many}) => ({
	projects: many(projects),
	chatSessions: many(chatSessions),
}));

export const charactersRelations = relations(characters, ({one}) => ({
	project: one(projects, {
		fields: [characters.projectId],
		references: [projects.id]
	}),
}));

export const locationsRelations = relations(locations, ({one, many}) => ({
	project: one(projects, {
		fields: [locations.projectId],
		references: [projects.id]
	}),
	scenes: many(scenes),
}));

export const scenesRelations = relations(scenes, ({one}) => ({
	project: one(projects, {
		fields: [scenes.projectId],
		references: [projects.id]
	}),
	location: one(locations, {
		fields: [scenes.locationId],
		references: [locations.id]
	}),
	chapter: one(chapters, {
		fields: [scenes.chapterId],
		references: [chapters.id]
	}),
}));

export const chaptersRelations = relations(chapters, ({one, many}) => ({
	scenes: many(scenes),
	project: one(projects, {
		fields: [chapters.projectId],
		references: [projects.id]
	}),
}));

export const chatSessionsRelations = relations(chatSessions, ({one, many}) => ({
	user: one(users, {
		fields: [chatSessions.userId],
		references: [users.id]
	}),
	project: one(projects, {
		fields: [chatSessions.projectId],
		references: [projects.id]
	}),
	chatMessages: many(chatMessages),
}));

export const chatMessagesRelations = relations(chatMessages, ({one}) => ({
	chatSession: one(chatSessions, {
		fields: [chatMessages.sessionId],
		references: [chatSessions.id]
	}),
}));