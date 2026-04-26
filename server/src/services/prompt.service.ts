// Prompt Service - Upravljanje AI promptovima
// Zadatak 3.3.3 - Kreiran prema tehničkom planu

import { SceneContext } from './context.builder.js';

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
* **Scene Title:** ${scene.title || 'Untitled'}
* **Scene Summary:** ${scene.summary || 'Not specified'}
* **Scene Order:** ${scene.order || 'N/A'}

**Your Task:**
Based *only* on the data provided above, write a 1-2 sentence synopsis for this scene.
`;
  }

}
