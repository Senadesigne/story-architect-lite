// Prompt Service - Upravljanje AI promptovima
// Zadatak 3.3.3 - Kreiran prema tehničkom planu

import { SceneContext, CharacterContext, ProjectContext } from './context.builder';

// Pomoćna funkcija za formatiranje liste
function formatList(items: any[], placeholder = 'N/A'): string {
  if (!items || items.length === 0) {
    return placeholder;
  }
  return items.map((item) => item.name || 'Unknown').join(', ');
}

/**
 * PromptService klasa za kreiranje strukturiranih promptova
 * Separation of concerns - odvojeno od AI service logike
 */
export class PromptService {
  /**
   * Kreira prompt za generiranje sinopsisa scene
   */
  static buildSceneSynopsisPrompt(context: SceneContext): string {
    const { scene, characters, location } = context;

    // Koristimo engleski za promptove jer AI modeli najbolje reagiraju
    return `
You are a professional screenwriting assistant. Your task is to generate a concise, professional, 1-2 sentence synopsis for a scene based on its raw data.

**Project Context:**
* **Characters in Project:** ${formatList(characters)}
* **Location:** ${location?.name || 'N/A'}

**Scene Data to Summarize:**
* **Scene Title/Number:** ${scene.title || 'Untitled'}
* **Scene Goal:** ${scene.goal || 'Not specified'}
* **Emotional Value (Start):** ${scene.emotionalValueStart || 'N/A'}
* **Emotional Value (End):** ${scene.emotionalValueEnd || 'N/A'}
* **Scene Content/Notes:**
    ${scene.content || 'No content provided.'}

**Your Task:**
Based *only* on the data provided above, write a 1-2 sentence synopsis for this scene.
`;
  }

  /**
   * Kreira prompt za razvoj lika
   */
  static buildCharacterDevelopmentPrompt(context: CharacterContext): string {
    // TODO: Implementirati u sljedećem koraku
    return 'Placeholder prompt for character development';
  }

  /**
   * Kreira prompt za outline priče
   */
  static buildPlotOutlinePrompt(context: ProjectContext): string {
    // TODO: Implementirati u sljedećem koraku
    return 'Placeholder prompt for plot outline';
  }

  /**
   * Pomoćna metoda za formatiranje konteksta u čitljiv oblik
   */
  private static formatContextForPrompt(context: any): string {
    // TODO: Implementirati formatiranje konteksta
    return JSON.stringify(context, null, 2);
  }
}
