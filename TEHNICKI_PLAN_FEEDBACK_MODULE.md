# Tehnički Plan: Feedback & Tasks Modul

Ovaj dokument opisuje tehničku implementaciju internog modula za prikupljanje povratnih informacija i praćenje zadataka.

## 1. Baza Podataka (Drizzle ORM)

Potrebno je proširiti `server/src/schema/schema.ts` novom tablicom za pohranu feedbacka.

### Nova Tablica: `feedback`

```typescript
import { pgTable, text, timestamp, uuid, varchar, index } from 'drizzle-orm/pg-core';
import { users } from './schema'; // Import postojeće users tablice

export const feedback = pgTable('feedback', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 256 }).notNull(),
  description: text('description').notNull(),
  status: varchar('status', { length: 20 }).notNull().default('open'), // 'open', 'in-progress', 'closed'
  type: varchar('type', { length: 20 }).notNull().default('idea'), // 'bug', 'suggestion', 'idea'
  url: text('url'), // Opcionalno: URL stranice gdje je feedback prijavljen
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('idx_feedback_user_id').on(table.userId),
  statusIdx: index('idx_feedback_status').on(table.status),
}));
```

### Relacije

Potrebno je dodati relacije u `schema.ts`:

```typescript
export const feedbackRelations = relations(feedback, ({ one }) => ({
  user: one(users, { fields: [feedback.userId], references: [users.id] }),
}));

// U usersRelations dodati:
// feedback: many(feedback),
```

---

## 2. Backend API

Potrebno je implementirati nove rute u `server/src/api.ts` (ili novi router `server/src/routes/feedback.ts`).

### Rute

#### 1. Dohvati sve feedback-ove
*   **Method:** `GET`
*   **Path:** `/api/feedback`
*   **Auth:** Obavezna (samo autentificirani korisnici)
*   **Response:** JSON lista svih feedback unosa, sortirana po `createdAt` (najnoviji prvi).

#### 2. Kreiraj novi feedback
*   **Method:** `POST`
*   **Path:** `/api/feedback`
*   **Auth:** Obavezna
*   **Body:**
    ```json
    {
      "title": "Naslov feedbacka",
      "description": "Detaljan opis...",
      "type": "bug" | "suggestion" | "idea",
      "url": "/project/123/studio" // Opcionalno
    }
    ```
*   **Response:** Kreirani objekt.

#### 3. Ažuriraj status (samo za admin/dev)
*   **Method:** `PATCH`
*   **Path:** `/api/feedback/:id`
*   **Auth:** Obavezna
*   **Body:**
    ```json
    {
      "status": "in-progress" | "closed"
    }
    ```
*   **Response:** Ažurirani objekt.

---

## 3. UI Komponente

### 3.1. Feedback Trigger (Gumb)
*   **Lokacija:** `ui/src/components/ProjectNav.tsx` (desna strana, uz User ikonu).
*   **Dizajn:** Ikona žarulje (💡) ili buba (🐛) s tekstom "Feedback".
*   **Akcija:** Klikom otvara `FeedbackDialog`.

### 3.2. Feedback Dialog (Modal)
*   **Komponenta:** `ui/src/components/feedback/FeedbackDialog.tsx`
*   **Sadržaj:**
    *   Forma s poljima:
        *   **Type:** Dropdown/Radio (Bug, Suggestion, Idea)
        *   **Title:** Input
        *   **Description:** Textarea
    *   **Submit:** Poziva `POST /api/feedback`.
    *   **State:** Koristiti `react-query` mutaciju za slanje.

### 3.3. Feedback Dashboard (Stranica)
*   **Lokacija:** Nova ruta `/feedback` ili modalni pregled (kao "Inbox").
*   **Komponenta:** `ui/src/pages/FeedbackDashboard.tsx`
*   **Prikaz:**
    *   Tablica ili lista kartica.
    *   Filteri po statusu i tipu.
    *   Prikaz statusa s bojama (Open: zeleno, In-Progress: žuto, Closed: sivo).
    *   Mogućnost promjene statusa (dropdown ili gumb) za svaki item.

---

## 4. Koraci Implementacije

1.  **Backend & Baza:**
    *   Dodati `feedback` tablicu u `schema.ts`.
    *   Pokrenuti `drizzle-kit generate` i `migrate`.
    *   Implementirati API rute.
2.  **Frontend - Input:**
    *   Kreirati `FeedbackDialog` komponentu.
    *   Dodati gumb u `ProjectNav`.
    *   Povezati s API-jem.
3.  **Frontend - Dashboard:**
    *   Kreirati stranicu za pregled feedbacka.
    *   Implementirati logiku za promjenu statusa.
