
import { VertexAI, GenerativeModel, HarmCategory, HarmBlockThreshold } from '@google-cloud/vertexai';
import { getDatabase } from '../../lib/db.js';
import { scenes, chapters, editorAnalyses } from '../../schema/schema.js';
import { eq, asc, desc } from 'drizzle-orm';

interface BookContextCache {
    cachedContentName: string; // Resource name from Vertex AI (projects/.../locations/.../cachedContents/...)
    createTime: number;
    expireTime: number;
    projectId: string;
}

// Simple in-memory storage for cache references (to avoid re-querying Vertex endlessly)
// In production, this might be better in Redis or the DB itself, but memory is fine for now.
const activeCaches: Record<string, BookContextCache> = {};

export class VertexAIService {
    private vertexAI: VertexAI;
    private project: string;
    private location: string = 'us-central1';
    private modelName: string = 'gemini-1.5-pro-001';

    constructor() {
        this.project = process.env.GOOGLE_CLOUD_PROJECT_ID || 'gen-lang-client-0077119957'; // Fallback from screenshot

        // Auth is handled automatically via GOOGLE_APPLICATION_CREDENTIALS env var 
        // OR we can pass credentials explicitly if we parse the JSON env var.
        const serviceAccountJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;

        if (serviceAccountJson) {
            try {
                const credentials = JSON.parse(serviceAccountJson);
                this.vertexAI = new VertexAI({
                    project: this.project,
                    location: this.location,
                    googleAuthOptions: {
                        credentials,
                    }
                });
            } catch (e) {
                console.error('Failed to parse GOOGLE_SERVICE_ACCOUNT_JSON', e);
                throw new Error('Invalid Google Service Account configuration');
            }
        } else {
            // Fallback to default auth (will work if running on Cloud Run or with gcloud auth application-default login)
            this.vertexAI = new VertexAI({
                project: this.project,
                location: this.location
            });
        }
    }

    /**
     * 1. Dohvaća cijelu knjigu kao jedan string.
     * Spaja scene kronološki per poglavlju.
     */
    async fetchFullBookContext(projectId: string): Promise<string> {
        const db = await getDatabase();

        // Dohvati scene s chapter informacijama
        const allScenes = await db.query.scenes.findMany({
            where: eq(scenes.projectId, projectId),
            with: {
                chapter: true,
            },
            orderBy: [asc(scenes.order)], // Prvo sortiraj scene
        });

        if (allScenes.length === 0) {
            return "Knjiga je trenutno prazna.";
        }

        // Sortiraj dodatno po chapter orderu ako je potrebno (iako scene order bi trebao biti globalni ili relativni)
        // Pretpostavka: scenes.order je redni broj unutar projekta ili chaptera. 
        // Ako je unutar chaptera, moramo sortirati po chapter.order pa scene.order.

        const sortedScenes = allScenes.sort((a, b) => {
            const chapterOrderA = a.chapter?.order ?? 9999;
            const chapterOrderB = b.chapter?.order ?? 9999;

            if (chapterOrderA !== chapterOrderB) {
                return chapterOrderA - chapterOrderB;
            }
            return a.order - b.order;
        });

        let bookContext = "# KONTEKST KNJIGE\n\n";

        let currentChapterId = "";

        sortedScenes.forEach(scene => {
            if (scene.chapter && scene.chapter.id !== currentChapterId) {
                bookContext += `\n## POGLAVLJE: ${scene.chapter.title}\n\n`;
                currentChapterId = scene.chapter.id;
            }
            bookContext += `### SCENA: ${scene.title}\n`;
            bookContext += `${scene.summary || "(Nema teksta scene)"}\n\n`;
        });

        return bookContext;
    }

    /**
     * 2. Upravljanje Cacheom
     * Kreira ili vraća postojeći CachedContent resurs na Vertex AI.
     */
    async getOrCreateBookCache(projectId: string, content: string): Promise<string> {

        // Provjeri lokalni cache tracker
        const existingCache = activeCaches[projectId];

        // Ako postoji i nije pred istekom (npr. > 5 min do isteka), vrati ga
        if (existingCache && existingCache.expireTime > Date.now() + 5 * 60 * 1000) {
            console.log(`[VertexAI] Using existing cache for project ${projectId}`);
            return existingCache.cachedContentName;
        }

        // Ako ne postoji, kreiraj novi
        console.log(`[VertexAI] Creating NEW Context Cache for project ${projectId}...`);

        // Vertex AI Cache API (preview functionality)
        // Koristimo generički client manager jer SDK možda nema striktne tipove za Cache beta feature još
        // Ali @google-cloud/vertexai podržava cachedContent

        const ttlSeconds = 60 * 60; // 1 sat

        // @ts-ignore - Cache je nov feature
        const cachedContent = await this.vertexAI.preview.cachedContents.create({
            model: this.modelName,
            contents: [{
                role: 'user',
                parts: [{ text: content }]
            }],
            ttl: `${ttlSeconds}s`, // Duration string format: "3600s"
            displayName: `project-${projectId}-cache`
        });

        // Ensure cache name exists
        if (!cachedContent.name) {
            throw new Error('Failed to create cache: no cache name returned from Vertex AI');
        }

        // Spremi u memory mapu
        activeCaches[projectId] = {
            cachedContentName: cachedContent.name,
            createTime: Date.now(),
            expireTime: Date.now() + (ttlSeconds * 1000),
            projectId
        };

        return cachedContent.name;
    }

    /**
     * 3. Glavna funkcija: Run Analysis
     */
    async runAnalysis(projectId: string, userId: string, prompt: string): Promise<string> {
        const db = await getDatabase();

        // 1. Pripremi kontekst
        const bookContent = await this.fetchFullBookContext(projectId);

        // 2. Kreiraj/Dohvati Cache
        // NAPOMENA: Za prvu verziju, ako je tekst kratak (< 30k tokena), možda ne treba cache?
        // Ali user je tražio cache. Implementirat ćemo ga.
        let cachedInfoName: string | undefined;

        try {
            cachedInfoName = await this.getOrCreateBookCache(projectId, bookContent);
        } catch (error) {
            console.warn('Failed to create cache, falling back to standard context', error);
            // Fallback: send content directly in prompt if cache fails
        }

        // 3. System Prompt
        const systemInstruction = `
    Ti si GLAVNI UREDNIK (Chief Editor) u vrhunskoj izdavačkoj kući.
    Tvoj zadatak je dati dubinsku, kritičku i konstruktivnu analizu rukopisa.
    
    PRAVILA:
    - Koristi MARKDOWN formatiranje (bold, liste, h1, h2).
    - Budi objektivan, ali oštar kad je potrebno.
    - Fokusiraj se na tok radnje, konzistentnost likova i tempo.
    - Tvoj odgovor mora biti strukturiran kao profesionalni izvještaj.
    `;

        // 4. Inicijaliziraj model
        // Ako imamo cache, koristimo ga
        let generativeModel: GenerativeModel;

        if (cachedInfoName) {
            // Instanciranje modela s cache-om
            generativeModel = this.vertexAI.getGenerativeModel({
                model: this.modelName,
                systemInstruction: systemInstruction,
                cachedContent: { name: cachedInfoName }
            });
        } else {
            generativeModel = this.vertexAI.getGenerativeModel({
                model: this.modelName,
                systemInstruction: systemInstruction,
            });
        }

        const start = Date.now();

        // 5. Pošalji upit
        const userMessage = cachedInfoName
            ? prompt // Ako je cache aktivan, šaljemo samo prompt
            : `KONTEKST KNJIGE:\n${bookContent}\n\nZADATAK:\n${prompt}`; // Fallback


        const result = await generativeModel.generateContent({
            contents: [{ role: 'user', parts: [{ text: userMessage }] }],
            generationConfig: {
                maxOutputTokens: 8192,
                temperature: 0.7,
            }
        });

        const responseContent = result.response.candidates?.[0].content.parts[0].text || "Greška pri generiranju.";
        const usage = result.response.usageMetadata;

        // 6. Spremi u bazu
        await db.insert(editorAnalyses).values({
            projectId,
            userId,
            prompt,
            content: responseContent,
            model: this.modelName + (cachedInfoName ? '-cached' : ''),
            inputTokens: usage?.promptTokenCount || 0,
            outputTokens: usage?.candidatesTokenCount || 0,
        });

        return responseContent;
    }
}
