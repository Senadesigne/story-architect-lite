import { pgTable, index, uuid, text, jsonb, vector, timestamp, foreignKey, varchar, unique, integer } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const storyArchitectEmbeddings = pgTable("story_architect_embeddings", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	content: text().notNull(),
	metadata: jsonb().default({}),
	vector: vector({ dimensions: 1536 }).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => {
	return {
		idxEmbeddingsCreatedAt: index("idx_embeddings_created_at").using("btree", table.createdAt.asc().nullsLast().op("timestamp_ops")),
		idxStoryArchitectEmbeddingsVector: index("idx_story_architect_embeddings_vector").using("hnsw", table.vector.asc().nullsLast().op("vector_cosine_ops")),
	}
});

export const projects = pgTable("projects", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	title: varchar({ length: 256 }).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	userId: text("user_id").notNull(),
	logline: text(),
	premise: text(),
	theme: text(),
	genre: text(),
	audience: text(),
	brainstorming: text(),
	research: text(),
	rulesDefinition: text("rules_definition"),
	cultureAndHistory: text("culture_and_history"),
	synopsis: text(),
	outlineNotes: text("outline_notes"),
	pointOfView: text("point_of_view"),
	storyIdea: text("story_idea"),
	beatSheetSetup: text("beat_sheet_setup"),
	beatSheetIncitingIncident: text("beat_sheet_inciting_incident"),
	beatSheetMidpoint: text("beat_sheet_midpoint"),
	beatSheetClimax: text("beat_sheet_climax"),
	beatSheetFallingAction: text("beat_sheet_falling_action"),
}, (table) => {
	return {
		idxProjectsUserId: index("idx_projects_user_id").using("btree", table.userId.asc().nullsLast().op("text_ops")),
		projectsUserIdUsersIdFk: foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "projects_user_id_users_id_fk"
		}).onDelete("cascade"),
	}
});

export const characters = pgTable("characters", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	name: varchar({ length: 256 }).notNull(),
	role: text(),
	motivation: text(),
	goal: text(),
	fear: text(),
	backstory: text(),
	arcStart: text("arc_start"),
	arcEnd: text("arc_end"),
	projectId: uuid("project_id").notNull(),
}, (table) => {
	return {
		idxCharactersProjectId: index("idx_characters_project_id").using("btree", table.projectId.asc().nullsLast().op("uuid_ops")),
		charactersProjectIdProjectsIdFk: foreignKey({
			columns: [table.projectId],
			foreignColumns: [projects.id],
			name: "characters_project_id_projects_id_fk"
		}).onDelete("cascade"),
	}
});

export const locations = pgTable("locations", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	name: varchar({ length: 256 }).notNull(),
	description: text(),
	projectId: uuid("project_id").notNull(),
}, (table) => {
	return {
		idxLocationsProjectId: index("idx_locations_project_id").using("btree", table.projectId.asc().nullsLast().op("uuid_ops")),
		locationsProjectIdProjectsIdFk: foreignKey({
			columns: [table.projectId],
			foreignColumns: [projects.id],
			name: "locations_project_id_projects_id_fk"
		}).onDelete("cascade"),
	}
});

export const users = pgTable("users", {
	id: text().primaryKey().notNull(),
	email: text().notNull(),
	displayName: text("display_name"),
	avatarUrl: text("avatar_url"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => {
	return {
		idxUsersEmail: index("idx_users_email").using("btree", table.email.asc().nullsLast().op("text_ops")),
		usersEmailUnique: unique("users_email_unique").on(table.email),
	}
});

export const scenes = pgTable("scenes", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	title: varchar({ length: 256 }).notNull(),
	summary: text(),
	order: integer().default(0).notNull(),
	projectId: uuid("project_id").notNull(),
	locationId: uuid("location_id"),
	chapterId: uuid("chapter_id"),
}, (table) => {
	return {
		idxScenesChapterId: index("idx_scenes_chapter_id").using("btree", table.chapterId.asc().nullsLast().op("uuid_ops")),
		idxScenesLocationId: index("idx_scenes_location_id").using("btree", table.locationId.asc().nullsLast().op("uuid_ops")),
		idxScenesOrder: index("idx_scenes_order").using("btree", table.projectId.asc().nullsLast().op("uuid_ops"), table.order.asc().nullsLast().op("uuid_ops")),
		idxScenesProjectId: index("idx_scenes_project_id").using("btree", table.projectId.asc().nullsLast().op("uuid_ops")),
		scenesProjectIdProjectsIdFk: foreignKey({
			columns: [table.projectId],
			foreignColumns: [projects.id],
			name: "scenes_project_id_projects_id_fk"
		}).onDelete("cascade"),
		scenesLocationIdLocationsIdFk: foreignKey({
			columns: [table.locationId],
			foreignColumns: [locations.id],
			name: "scenes_location_id_locations_id_fk"
		}),
		scenesChapterIdChaptersIdFk: foreignKey({
			columns: [table.chapterId],
			foreignColumns: [chapters.id],
			name: "scenes_chapter_id_chapters_id_fk"
		}).onDelete("set null"),
	}
});

export const chatSessions = pgTable("chat_sessions", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: text("user_id").notNull(),
	projectId: uuid("project_id").notNull(),
	name: text().notNull(),
	mode: text().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => {
	return {
		idxChatSessionsProjectId: index("idx_chat_sessions_project_id").using("btree", table.projectId.asc().nullsLast().op("uuid_ops")),
		idxChatSessionsUserId: index("idx_chat_sessions_user_id").using("btree", table.userId.asc().nullsLast().op("text_ops")),
		chatSessionsUserIdUsersIdFk: foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "chat_sessions_user_id_users_id_fk"
		}).onDelete("cascade"),
		chatSessionsProjectIdProjectsIdFk: foreignKey({
			columns: [table.projectId],
			foreignColumns: [projects.id],
			name: "chat_sessions_project_id_projects_id_fk"
		}).onDelete("cascade"),
	}
});

export const chatMessages = pgTable("chat_messages", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	sessionId: uuid("session_id").notNull(),
	role: text().notNull(),
	content: text().notNull(),
	metadata: jsonb(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => {
	return {
		idxChatMessagesSessionId: index("idx_chat_messages_session_id").using("btree", table.sessionId.asc().nullsLast().op("uuid_ops")),
		chatMessagesSessionIdChatSessionsIdFk: foreignKey({
			columns: [table.sessionId],
			foreignColumns: [chatSessions.id],
			name: "chat_messages_session_id_chat_sessions_id_fk"
		}).onDelete("cascade"),
	}
});

export const chapters = pgTable("chapters", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	title: varchar({ length: 256 }).notNull(),
	phase: varchar({ length: 50 }).notNull(),
	order: integer().default(0).notNull(),
	projectId: uuid("project_id").notNull(),
}, (table) => {
	return {
		idxChaptersOrder: index("idx_chapters_order").using("btree", table.projectId.asc().nullsLast().op("int4_ops"), table.order.asc().nullsLast().op("int4_ops")),
		idxChaptersProjectId: index("idx_chapters_project_id").using("btree", table.projectId.asc().nullsLast().op("uuid_ops")),
		chaptersProjectIdProjectsIdFk: foreignKey({
			columns: [table.projectId],
			foreignColumns: [projects.id],
			name: "chapters_project_id_projects_id_fk"
		}).onDelete("cascade"),
	}
});
