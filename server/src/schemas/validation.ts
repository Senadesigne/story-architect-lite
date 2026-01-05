import { z } from 'zod';
// Force git update

// ========== USER VALIDATION SCHEMAS ==========

export const UpdateUserBodySchema = z.object({
  displayName: z.string().optional(),
  avatarUrl: z.string().optional(), // TS2554 Fix: removed .url().or(z.literal(''))
});

// ========== PROJECT VALIDATION SCHEMAS ==========

export const CreateProjectBodySchema = z.object({
  name: z.string().min(1, 'Name is required').trim(),
});

export const UpdateProjectBodySchema = z.object({
  story_idea: z.string().optional(),
  // Logline removed
  premise: z.string().optional(),
  theme: z.string().optional(),
  genre: z.string().optional(),
  audience: z.string().optional(),
  brainstorming: z.string().optional(),
  research: z.string().optional(),
  rules_definition: z.string().optional(),
  culture_and_history: z.string().optional(),
  synopsis: z.string().optional(),
  outline_notes: z.string().optional(),
  beat_sheet_setup: z.string().optional(),
  beat_sheet_inciting_incident: z.string().optional(),
  beat_sheet_midpoint: z.string().optional(),
  beat_sheet_climax: z.string().optional(),
  beat_sheet_falling_action: z.string().optional(),
  point_of_view: z.string().optional(),
}).refine(
  (data) => Object.values(data).some(value => value !== undefined),
  { message: 'At least one field must be provided' }
);

// ========== LOCATION VALIDATION SCHEMAS ==========

export const CreateLocationBodySchema = z.object({
  name: z.string().min(1, 'Name is required').trim(),
  description: z.string().optional(),
});

export const UpdateLocationBodySchema = z.object({
  name: z.string().min(1, 'Name cannot be empty').trim().optional(),
  description: z.string().optional(),
}).refine(
  (data) => Object.values(data).some(value => value !== undefined),
  { message: 'At least one field (name, description) must be provided' }
);

// ========== CHARACTER VALIDATION SCHEMAS ==========

export const CreateCharacterBodySchema = z.object({
  name: z.string().min(1, 'Name is required').trim(),
  role: z.string().optional(),
  motivation: z.string().optional(),
  goal: z.string().optional(),
  fear: z.string().optional(),
  backstory: z.string().optional(),
  arcStart: z.string().optional(),
  arcEnd: z.string().optional(),
});

export const UpdateCharacterBodySchema = z.object({
  name: z.string().min(1, 'Name cannot be empty').trim().optional(),
  role: z.string().optional(),
  motivation: z.string().optional(),
  goal: z.string().optional(),
  fear: z.string().optional(),
  backstory: z.string().optional(),
  arcStart: z.string().optional(),
  arcEnd: z.string().optional(),
}).refine(
  (data) => Object.values(data).some(value => value !== undefined),
  { message: 'At least one field must be provided' }
);



// ========== CHAPTER VALIDATION SCHEMAS ==========

export const CreateChapterBodySchema = z.object({
  title: z.string().min(1, 'Title is required').trim(),
  phase: z.string().min(1, 'Phase is required').trim(),
  order: z.number().int().min(0).optional(),
});

export const UpdateChapterBodySchema = z.object({
  title: z.string().min(1, 'Title cannot be empty').trim().optional(),
  phase: z.string().min(1, 'Phase cannot be empty').trim().optional(),
  order: z.number().int().min(0).optional(),
}).refine(
  (data) => Object.values(data).some(value => value !== undefined),
  { message: 'At least one field must be provided' }
);

// ========== SCENE VALIDATION SCHEMAS ==========

export const CreateSceneBodySchema = z.object({
  title: z.string().min(1, 'Title is required').trim(),
  summary: z.string().optional(),
  order: z.number().int().min(0).optional(),
  locationId: z.string().optional(), // TS2554 Fix
  chapterId: z.string().optional(), // TS2554 Fix
});

export const UpdateSceneBodySchema = z.object({
  title: z.string().min(1, 'Title cannot be empty').trim().optional(),
  summary: z.string().optional(),
  order: z.number().int().min(0).optional(),
  locationId: z.string().optional(), // TS2554 Fix
  chapterId: z.string().optional(), // TS2554 Fix
}).refine(
  (data) => Object.values(data).some(value => value !== undefined),
  { message: 'At least one field must be provided' }
);

// ========== AI VALIDATION SCHEMAS ==========

export const GenerateSceneSynopsisBodySchema = z.object({
  sceneId: z.string(), // TS2554 Fix
});

export const ChatRequestBodySchema = z.object({
  userInput: z.string().min(1, 'User input is required').trim(),
  sessionId: z.string().optional(), // TS2554 Fix
  plannerContext: z.string().optional(),
  mode: z.string().optional(), // TS2554 Fix: z.enum failing
  editorContent: z.string().optional(),
  selection: z.string().optional(),
  messages: z.array(
    z.object({
      role: z.string(), // TS2554 Fix: z.enum failing
      content: z.string(),
    })
  ).optional(),
});

// ========== INFERRED TYPES ==========

export type UpdateUserBody = z.infer<typeof UpdateUserBodySchema>;
export type CreateProjectBody = z.infer<typeof CreateProjectBodySchema>;
export type UpdateProjectBody = z.infer<typeof UpdateProjectBodySchema>;
export type CreateLocationBody = z.infer<typeof CreateLocationBodySchema>;
export type UpdateLocationBody = z.infer<typeof UpdateLocationBodySchema>;
export type CreateCharacterBody = z.infer<typeof CreateCharacterBodySchema>;
export type UpdateCharacterBody = z.infer<typeof UpdateCharacterBodySchema>;
export type CreateSceneBody = z.infer<typeof CreateSceneBodySchema>;
export type UpdateSceneBody = z.infer<typeof UpdateSceneBodySchema>;
export type CreateChapterBody = z.infer<typeof CreateChapterBodySchema>;
export type UpdateChapterBody = z.infer<typeof UpdateChapterBodySchema>;
export type GenerateSceneSynopsisBody = z.infer<typeof GenerateSceneSynopsisBodySchema>;
export type ChatRequestBody = z.infer<typeof ChatRequestBodySchema>;

