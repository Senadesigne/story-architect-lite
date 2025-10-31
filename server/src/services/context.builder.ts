// Context Builder - Priprema konteksta za AI promptove
// Zadatak 3.3.1 - Kreiran prema tehničkom planu

import { getDatabase } from '../lib/db';
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
    db: ReturnType<typeof getDatabase> extends Promise<infer T> ? T : never,
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
    db: ReturnType<typeof getDatabase> extends Promise<infer T> ? T : never
  ): Promise<ProjectContext> {
    // TODO: Implementirati u sljedećem koraku
    throw new Error('Not implemented yet');
  }

  /**
   * Priprema kontekst za lika s povezanim podacima
   */
  static async buildCharacterContext(
    characterId: string, 
    projectId: string, 
    db: ReturnType<typeof getDatabase> extends Promise<infer T> ? T : never
  ): Promise<CharacterContext> {
    // TODO: Implementirati u sljedećem koraku
    throw new Error('Not implemented yet');
  }
}
