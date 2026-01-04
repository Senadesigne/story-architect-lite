// Context Builder - Priprema konteksta za AI promptove
// Zadatak 3.3.1 - Kreiran prema tehničkom planu

import { getDatabase } from '../lib/db';
import type { DatabaseConnection } from '../lib/db';
import * as tables from '../schema/schema';
import { and, eq } from 'drizzle-orm';
import { HTTPException } from 'hono/http-exception';

// Tipovi podataka izvučeni iz Drizzle sheme
type SceneData = typeof tables.scenes.$inferSelect;
type CharacterData = typeof tables.characters.$inferSelect;
type LocationData = typeof tables.locations.$inferSelect;
type ProjectData = typeof tables.projects.$inferSelect;

// Definicije konteksta
export interface SceneContext {
  scene: SceneData;
  characters: CharacterData[];
  location: LocationData | null;
}

export interface ProjectContext {
  project: ProjectData;
  characters: CharacterData[];
  locations: LocationData[];
  scenes: SceneData[];
}

export interface CharacterContext {
  character: CharacterData;
  project: ProjectData;
  scenes: SceneData[];
}

/**
 * ContextBuilder klasa za pripremu konteksta iz baze podataka
 * Koristi Drizzle ORM za dohvaćanje povezanih podataka
 */
export class ContextBuilder {
  /**
   * Priprema kontekst za scenu s povezanim podacima
   */
  static async buildSceneContext(
    sceneId: string,
    db: DatabaseConnection,
    projectId: string,
  ): Promise<SceneContext> {

    const sceneData = await db.query.scenes.findFirst({
      where: and(
        eq(tables.scenes.id, sceneId),
        eq(tables.scenes.projectId, projectId) // Sigurnosna provjera
      ),
      with: {
        location: true, // Dohvati povezanu lokaciju
      },
    });

    if (!sceneData) {
      throw new HTTPException(404, { message: 'Scene not found or access denied' });
    }

    // Dohvati sve likove iz projekta (budući da nema many-to-many veze)
    const characters = await db.query.characters.findMany({
      where: eq(tables.characters.projectId, projectId),
    });

    return {
      scene: sceneData,
      characters: characters,
      location: sceneData.location || null,
    };
  }

  /**
   * Priprema kontekst za cijeli projekt
   */
  static async buildProjectContext(
    projectId: string,
    db: DatabaseConnection
  ): Promise<ProjectContext> {

    const projectData = await db.query.projects.findFirst({
      where: eq(tables.projects.id, projectId),
      with: {
        characters: true,
        locations: true,
        scenes: true
      }
    });

    if (!projectData) {
      throw new Error('Project not found');
    }

    return {
      project: projectData,
      characters: projectData.characters,
      locations: projectData.locations,
      scenes: projectData.scenes
    };
  }

  /**
   * Priprema kontekst za lika s povezanim podacima
   */
  static async buildCharacterContext(
    characterId: string,
    projectId: string,
    db: DatabaseConnection
  ): Promise<CharacterContext> {
    // TODO: Implementirati u sljedećem koraku
    throw new Error('Not implemented yet');
  }

  /**
   * Formatira ProjectContext u čitljiv string za AI
   */
  static formatProjectContextToString(context: ProjectContext): string {
    const { project, characters, locations, scenes } = context;

    let storyContext = `KONTEKST PRIČE:

=== PROJEKT: ${project.title || 'Bez naslova'} ===
Premisa: ${project.premise || 'Nije definirano'}
Tema: ${project.theme || 'Nije definirano'}
Žanr: ${project.genre || 'Nije definirano'}
Publika: ${project.audience || 'Nije definirano'}

`;

    // Dodaj likove
    storyContext += `=== LIKOVI ===\n`;
    if (characters.length === 0) {
      storyContext += `Nema definiranih likova.\n\n`;
    } else {
      characters.forEach(character => {
        storyContext += `- Ime: ${character.name}`;
        if (character.role) storyContext += `, Uloga: ${character.role}`;
        if (character.motivation) storyContext += `, Motivacija: ${character.motivation}`;
        if (character.goal) storyContext += `, Cilj: ${character.goal}`;
        storyContext += `\n`;
      });
      storyContext += `\n`;
    }

    // Dodaj lokacije
    storyContext += `=== LOKACIJE ===\n`;
    if (locations.length === 0) {
      storyContext += `Nema definiranih lokacija.\n\n`;
    } else {
      locations.forEach(location => {
        storyContext += `- Naziv: ${location.name}`;
        if (location.description) storyContext += `, Opis: ${location.description}`;
        storyContext += `\n`;
      });
      storyContext += `\n`;
    }

    // Dodaj scene
    storyContext += `=== SCENE ===\n`;
    if (scenes.length === 0) {
      storyContext += `Nema definiranih scena.\n\n`;
    } else {
      // Sortiraj scene po redoslijed
      const sortedScenes = [...scenes].sort((a, b) => (a.order || 0) - (b.order || 0));
      sortedScenes.forEach(scene => {
        storyContext += `- Naslov: ${scene.title}`;
        if (scene.summary) storyContext += `, Sažetak: ${scene.summary}`;
        if (scene.order !== null) storyContext += `, Redoslijed: ${scene.order}`;
        storyContext += `\n`;
      });
      storyContext += `\n`;
    }

    return storyContext;
  }
}
