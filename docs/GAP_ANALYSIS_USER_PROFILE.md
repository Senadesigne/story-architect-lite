# Gap Analysis: User Profile / Settings za SaaS Model

**Datum:** 2024  
**Cilj:** Analiza razlika između trenutnog stanja i potrebnog za ozbiljan User Profile/Settings s podrškom za SaaS model (billing, AI quotas, preferences).

---

## 1. TRENUTNO STANJE

### 1.1. Baza Podataka (`server/src/schema/schema.ts`)

**Tablica `users` trenutno sadrži:**

```5:15:server/src/schema/schema.ts
export const users = pgTable('users', {
  id: text('id').primaryKey(), // Firebase UID je string
  email: text('email').notNull().unique(),
  displayName: text('display_name'),
  avatarUrl: text('avatar_url'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  // Indeks za brže pretraživanje po email adresi
  emailIdx: index('idx_users_email').on(table.email),
}));
```

**Sažetak:**
- ✅ Osnovni korisnički podaci (id, email, displayName, avatarUrl)
- ✅ Timestamp polja (createdAt, updatedAt)
- ✅ Indeks na email polju
- ❌ **NEDOSTAJE:** Subscription/billing polja
- ❌ **NEDOSTAJE:** AI usage tracking polja
- ❌ **NEDOSTAJE:** User preferences (JSON)

---

### 1.2. API Endpointi (`server/src/api.ts`)

**Postojeći user endpointi:**

```216:244:server/src/api.ts
// User endpoint
app.get('/api/user', (c) => {
  const user = c.get('user');
  return c.json(user);
});

// Update user profile
app.put('/api/user', validateBody(UpdateUserBodySchema), async (c) => {
  const user = c.get('user');
  const { displayName, avatarUrl } = getValidatedBody(c);
  
  const databaseUrl = getDatabaseUrl();
  const db = await getDatabase(databaseUrl);
  
  const updatedUser = await handleDatabaseOperation(async () => {
    const [result] = await db
      .update(users)
      .set({
        displayName: displayName || null,
        avatarUrl: avatarUrl || null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id))
      .returning();
    
    return result;
  });
  
  return c.json(updatedUser);
});
```

**Sažetak:**
- ✅ `GET /api/user` - Dohvaćanje trenutnog korisnika
- ✅ `PUT /api/user` - Ažuriranje displayName i avatarUrl
- ✅ `DELETE /api/user` - Brisanje korisničkog računa
- ❌ **NEDOSTAJE:** `PATCH /api/user/preferences` - Ažuriranje korisničkih postavki
- ❌ **NEDOSTAJE:** `GET /api/user/subscription` - Dohvaćanje subscription statusa
- ❌ **NEDOSTAJE:** `GET /api/user/usage` - Dohvaćanje AI usage statistika
- ❌ **NEDOSTAJE:** `POST /api/user/change-password` - Promjena lozinke (Firebase Auth, ali možda treba wrapper)

**Napomena:** Promjena lozinke ide direktno kroz Firebase Auth (`updatePassword()`), ne kroz naš API. To je u redu, ali možda trebamo wrapper endpoint za bolji UX.

---

### 1.3. Frontend Implementacija

**Postojeće komponente:**
- ✅ `UserProfileForm.tsx` - Osnovni profil (displayName, avatarUrl)
- ✅ `userStore.ts` (Zustand) - State management za korisnički profil
- ✅ `auth-context.tsx` - Firebase Auth integracija

**Sažetak:**
- ✅ Osnovni profil UI postoji
- ❌ **NEDOSTAJE:** UI za subscription management
- ❌ **NEDOSTAJE:** UI za AI usage dashboard
- ❌ **NEDOSTAJE:** UI za user preferences (theme, font, itd.)

---

## 2. NEDOSTAJE (Missing) - Što trebamo dodati

### 2.1. Baza Podataka - Polja za Subscription/Billing

**Potrebna polja u `users` tablici:**

```typescript
// Subscription & Billing
subscriptionStatus: text('subscription_status').default('free'), // 'free' | 'pro' | 'enterprise'
subscriptionTier: text('subscription_tier'), // 'basic' | 'standard' | 'premium'
stripeCustomerId: text('stripe_customer_id'), // Stripe Customer ID
stripeSubscriptionId: text('stripe_subscription_id'), // Stripe Subscription ID
subscriptionStartDate: timestamp('subscription_start_date'),
subscriptionEndDate: timestamp('subscription_end_date'),
subscriptionCancelAtPeriodEnd: boolean('subscription_cancel_at_period_end').default(false),
```

**Razlog:**
- Potrebno za SaaS monetizaciju
- Praćenje subscription statusa (free vs. paid)
- Integracija sa Stripe za billing
- Podrška za različite subscription tierove

---

### 2.2. Baza Podataka - Polja za AI Usage Tracking

**Potrebna polja u `users` tablici:**

```typescript
// AI Usage & Quotas
aiCreditsTotal: integer('ai_credits_total').default(0), // Ukupno kupljenih kredita
aiCreditsUsed: integer('ai_credits_used').default(0), // Potrošeno kredita
aiCreditsRemaining: integer('ai_credits_remaining').default(0), // Preostalo kredita
monthlyTokenLimit: integer('monthly_token_limit').default(10000), // Mjesečni limit tokena
monthlyTokensUsed: integer('monthly_tokens_used').default(0), // Potrošeno tokena ovaj mjesec
lastTokenResetDate: timestamp('last_token_reset_date').defaultNow(), // Datum zadnjeg resetiranja
```

**Alternativno:** Možemo kreirati zasebnu tablicu `user_ai_usage` za detaljnije praćenje:

```typescript
export const userAiUsage = pgTable('user_ai_usage', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  tokensUsed: integer('tokens_used').notNull(),
  requestType: text('request_type'), // 'chat' | 'scene_synopsis' | 'character_analysis'
  projectId: uuid('project_id').references(() => projects.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('idx_user_ai_usage_user_id').on(table.userId),
  createdAtIdx: index('idx_user_ai_usage_created_at').on(table.createdAt),
}));
```

**Razlog:**
- Praćenje AI potrošnje po korisniku
- Enforcing quota limits
- Analytics za optimizaciju AI troškova
- Billing prema stvarnoj potrošnji

---

### 2.3. Baza Podataka - Polja za User Preferences

**Potrebno polje u `users` tablici:**

```typescript
// User Preferences (JSONB)
preferences: jsonb('preferences').default({}).$type<{
  theme?: 'light' | 'dark' | 'system';
  defaultFont?: 'serif' | 'sans-serif' | 'monospace';
  editorFontSize?: number;
  editorLineHeight?: number;
  autoSave?: boolean;
  autoSaveInterval?: number; // sekunde
  language?: string; // 'hr' | 'en' | ...
  notifications?: {
    email?: boolean;
    push?: boolean;
    aiSuggestions?: boolean;
  };
  [key: string]: any;
}>(),
```

**Razlog:**
- Globalne postavke korisnika (theme, font, itd.)
- Fleksibilnost za buduće feature-e
- JSONB omogućava brze query-je i indeksiranje

---

### 2.4. API Endpointi - Nedostajuće Rute

**Potrebni novi endpointi:**

1. **Preferences Management:**
   - `GET /api/user/preferences` - Dohvaćanje preferences
   - `PATCH /api/user/preferences` - Ažuriranje preferences

2. **Subscription Management:**
   - `GET /api/user/subscription` - Dohvaćanje subscription statusa
   - `POST /api/user/subscription/upgrade` - Upgrade subscription (Stripe checkout)
   - `POST /api/user/subscription/cancel` - Cancel subscription
   - `POST /api/user/subscription/webhook` - Stripe webhook handler

3. **AI Usage Tracking:**
   - `GET /api/user/usage` - Dohvaćanje AI usage statistika
   - `GET /api/user/usage/history` - Povijest AI zahtjeva (ako koristimo `user_ai_usage` tablicu)

4. **Password Management (Optional):**
   - `POST /api/user/change-password` - Wrapper za Firebase `updatePassword()`

---

### 2.5. Frontend Komponente - Nedostajuće UI Elemente

**Potrebne nove komponente:**

1. **Settings Modal/Dropdown:**
   - `UserSettingsDropdown.tsx` - Dropdown menu na avataru
   - `UserSettingsModal.tsx` - Modal s tabovima (Profile, Preferences, Subscription, Usage)

2. **Subscription UI:**
   - `SubscriptionCard.tsx` - Prikaz trenutnog subscription statusa
   - `UpgradeButton.tsx` - CTA za upgrade
   - `UsageMeter.tsx` - Progress bar za AI usage

3. **Preferences UI:**
   - `PreferencesForm.tsx` - Forma za postavke (theme, font, itd.)

4. **Usage Dashboard:**
   - `UsageStats.tsx` - Statistike AI potrošnje
   - `UsageHistory.tsx` - Tablica s poviješću zahtjeva

---

## 3. PREPORUKE - Prvi Tehnički Koraci

### 3.1. Faza 1: Database Migration (Prioritet: 🔴 Kritično)

**Korak 1.1:** Proširiti `users` tablicu s novim poljima

**Akcija:**
1. Ažurirati `server/src/schema/schema.ts` s novim poljima:
   - Subscription polja (subscriptionStatus, stripeCustomerId, itd.)
   - AI usage polja (aiCreditsTotal, monthlyTokenLimit, itd.)
   - Preferences polje (JSONB)

2. Kreirati Drizzle migraciju:
   ```bash
   cd server
   pnpm drizzle-kit generate
   ```

3. Primijeniti migraciju:
   ```bash
   pnpm drizzle-kit migrate
   ```

**Ocjena vremena:** 1-2 sata

---

### 3.2. Faza 2: API Endpointi (Prioritet: 🟡 Važno)

**Korak 2.1:** Implementirati Preferences endpointi

**Akcija:**
1. Kreirati Zod schema za preferences (`server/src/schemas/validation.ts`)
2. Dodati `GET /api/user/preferences` endpoint
3. Dodati `PATCH /api/user/preferences` endpoint

**Korak 2.2:** Implementirati Usage endpointi

**Akcija:**
1. Dodati `GET /api/user/usage` endpoint
2. Implementirati logiku za izračun usage statistika

**Ocjena vremena:** 2-3 sata

---

### 3.3. Faza 3: Frontend UI (Prioritet: 🟢 Korisno)

**Korak 3.1:** Kreirati Settings Dropdown

**Akcija:**
1. Kreirati `UserSettingsDropdown.tsx` komponentu
2. Integrirati u `navbar.tsx` (avatar dropdown)
3. Dodati linkove na Profile, Preferences, Subscription, Usage

**Korak 3.2:** Implementirati Preferences Form

**Akcija:**
1. Kreirati `PreferencesForm.tsx` komponentu
2. Povezati s API endpointima
3. Dodati validaciju i error handling

**Ocjena vremena:** 4-6 sati

---

### 3.4. Faza 4: Subscription Integration (Prioritet: 🟡 Važno, ali kasnije)

**Korak 4.1:** Stripe Integration Setup

**Akcija:**
1. Instalirati Stripe SDK (`pnpm add stripe`)
2. Kreirati Stripe service (`server/src/services/stripe.service.ts`)
3. Implementirati webhook handler za subscription events

**Napomena:** Ovo je kompleksniji zadatak koji zahtijeva Stripe account setup i testiranje.

**Ocjena vremena:** 1-2 dana

---

## 4. ZAKLJUČAK

### Trenutno Stanje:
- ✅ Osnovni user profil funkcionalnost postoji
- ✅ CRUD operacije za displayName i avatarUrl
- ❌ Nedostaje podrška za SaaS model (billing, quotas, preferences)

### Kritični Gap:
**Najveći gap je u bazi podataka** - `users` tablica nema polja za:
1. Subscription status i Stripe integraciju
2. AI usage tracking i quotas
3. User preferences (JSON)

### Prvi Korak:
**Database migration je prvi i najvažniji korak.** Sve ostalo ovisi o tome da imamo pravilnu shemu u bazi.

### Prioritet Implementacije:
1. 🔴 **Faza 1:** Database Migration (kritično)
2. 🟡 **Faza 2:** API Endpointi (važno)
3. 🟢 **Faza 3:** Frontend UI (korisno)
4. 🟡 **Faza 4:** Stripe Integration (važno, ali kasnije)

---

## 5. DODATNE NAPOMENE

### Multi-User Podrška (Epic u Planu v2)
Prema `PROJEKTNI_PLAN_v2.md`, "Multi-User Podrška" Epic je označen kao ✅ Završeno. Međutim, to se odnosi na osnovnu autentifikaciju i CRUD operacije, ne na SaaS funkcionalnosti poput subscription managementa.

### AI Quota Error Handling
Postoji `AIQuotaExceededError` klasa u `server/src/services/ai.errors.ts`, ali trenutno nema stvarnog tracking-a korisničke potrošnje. To znači da error handling postoji, ali nema mehanizma za provjeru quota-a prije poziva AI servisa.

### Firebase Auth vs. Our API
Promjena lozinke ide direktno kroz Firebase Auth (`updatePassword()`), što je u redu. Međutim, možda trebamo wrapper endpoint za bolji UX i error handling.

---

**Izvještaj generiran:** 2024  
**Autor:** Gap Analysis - User Profile / Settings

