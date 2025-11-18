# Plan za "Book-Like" Dizajn Editora

## Trenutno Stanje - Analiza

### Što već postoji:
- ✅ `prose prose-lg` klase se koriste na `EditorContent` komponenti
- ✅ Editor je u scroll containeru s `p-6` paddingom
- ✅ TipTap editor je funkcionalan

### Što nedostaje:
- ❌ Tailwind Typography plugin nije instaliran (`@tailwindcss/typography`)
- ❌ Editor nema ograničenje širine (`max-w-none` uklanja default prose max-width)
- ❌ Nema vizualnog "papira" kontejnera (bijela pozadina, sjena, zaobljeni rubovi)
- ❌ Roditeljski kontejner nema različitu pozadinu da se "papir" istakne
- ❌ Nema responzivnog ponašanja za mobilne uređaje

---

## Detaljni Tehnički Plan

### Korak 1: Instalacija Tailwind Typography Plugin-a

**Problem:** 
- `prose` klasa se koristi, ali Tailwind Typography plugin nije instaliran
- U Tailwind CSS v4, plugin možda nije potreban ako postoji built-in podrška, ali za sigurnost treba instalirati

**Akcija:**
1. Instalirati `@tailwindcss/typography` plugin:
   ```bash
   pnpm add -D @tailwindcss/typography
   ```

2. **Provjera Tailwind CSS v4 kompatibilnosti:**
   - Tailwind CSS v4 koristi CSS-based konfiguraciju umjesto JS config fajla
   - Treba provjeriti da li plugin radi s v4 ili treba custom CSS implementacija
   - Ako plugin ne radi direktno, možda treba koristiti CSS import umjesto JS konfiguracije

3. **Alternativno rješenje (ako plugin ne radi s v4):**
   - Koristiti custom CSS stilove za prose-like izgled
   - Ili koristiti Tailwind CSS v3 kompatibilni pristup

**Napomena:** Tailwind CSS v4 je relativno nov, pa možda treba provjeriti dokumentaciju za Typography plugin podršku.

---

### Korak 2: Struktura "Papira" Kontejnera

**Trenutna struktura:**
```tsx
<div className="h-full flex flex-col">
  {editor && <FloatingMenuUI editor={editor} />}
  <div className="flex-1 overflow-y-auto p-6">
    <EditorContent 
      editor={editor} 
      className="prose prose-lg max-w-none h-full min-h-full" 
    />
  </div>
</div>
```

**Nova struktura (plan):**
```tsx
<div className="h-full flex flex-col">
  {editor && <FloatingMenuUI editor={editor} />}
  <div className="flex-1 overflow-y-auto bg-muted/50 py-8 px-4 sm:px-8">
    {/* "Papir" kontejner */}
    <div className="mx-auto max-w-3xl bg-background rounded-lg shadow-lg min-h-full">
      <div className="p-8 sm:p-12 md:p-16">
        <EditorContent 
          editor={editor} 
          className="prose prose-lg prose-slate dark:prose-invert max-w-none focus:outline-none" 
        />
      </div>
    </div>
  </div>
</div>
```

**Objašnjenje strukture:**

1. **Vanjski scroll container:**
   - `bg-muted/50` - svjetlija pozadina da se "papir" istakne
   - `py-8 px-4 sm:px-8` - vertikalni padding za razmak od rubova, horizontalni padding s responzivnim ponašanjem

2. **"Papir" kontejner:**
   - `mx-auto` - centriranje horizontalno
   - `max-w-3xl` - maksimalna širina (48rem / 768px) - optimalna za čitanje
   - `bg-background` - bijela pozadina u light modu, tamna u dark modu
   - `rounded-lg` - zaobljeni rubovi (8px)
   - `shadow-lg` - suptilna sjena za 3D efekt
   - `min-h-full` - osigurava da papir zauzme punu visinu scroll containera

3. **Unutarnji padding kontejner:**
   - `p-8 sm:p-12 md:p-16` - responzivni padding:
     - Mobilni: `p-8` (2rem / 32px)
     - Tablet: `sm:p-12` (3rem / 48px)
     - Desktop: `md:p-16` (4rem / 64px)

4. **EditorContent:**
   - `prose prose-lg` - Tailwind Typography stilovi
   - `prose-slate` - slate boja za tekst (može biti `prose-gray` ili custom)
   - `dark:prose-invert` - invertirane boje u dark modu
   - `max-w-none` - uklanja prose default max-width (jer već imamo max-w-3xl na papiru)
   - `focus:outline-none` - uklanja outline na fokusu (opcionalno)

---

### Korak 3: Tipografija i Prose Konfiguracija

**Ako Tailwind Typography plugin radi:**

1. **Prose varijante:**
   - `prose-lg` - veća veličina fonta (1.125rem base)
   - `prose-slate` ili `prose-gray` - boja teksta
   - `dark:prose-invert` - invertirane boje za dark mode

2. **Custom prose stilovi (ako je potrebno):**
   - Možda treba customizirati prose stilove za bolji "book-like" osjećaj
   - Veći line-height za čitljivost
   - Veći spacing između paragrafa

**Ako Tailwind Typography plugin NE radi s v4:**

1. **Custom CSS implementacija:**
   - Dodati custom CSS stilove u `index.css` za prose-like izgled
   - Koristiti Tailwind utility klase direktno
   - Definirati vlastite tipografske stilove

**Planirane prose klase:**
```css
/* U index.css, ako je potrebno custom implementacija */
@layer components {
  .prose-book {
    /* Custom stilovi za book-like izgled */
    font-size: 1.125rem;
    line-height: 1.75;
    color: var(--foreground);
  }
  
  .prose-book p {
    margin-top: 1.25em;
    margin-bottom: 1.25em;
  }
  
  .prose-book h1, .prose-book h2, .prose-book h3 {
    font-weight: 700;
    margin-top: 2em;
    margin-bottom: 1em;
  }
  
  /* itd. */
}
```

---

### Korak 4: Pozadina i Vizualni Identitet

**Roditeljski scroll container:**
- `bg-muted/50` - svjetlija pozadina (50% opacity) da se "papir" istakne
- Alternativa: `bg-gray-100 dark:bg-gray-900/50` za eksplicitniju kontrolu

**"Papir" kontejner:**
- `bg-background` - koristi design system boju (bijela u light, tamna u dark)
- Alternativa: `bg-white dark:bg-gray-800` za eksplicitniju kontrolu

**Sjena:**
- `shadow-lg` - suptilna sjena (0 10px 15px -3px rgba(0, 0, 0, 0.1))
- Alternativa: `shadow-xl` za jaču sjenu ili custom shadow

**Zaobljeni rubovi:**
- `rounded-lg` - 8px zaobljenje
- Alternativa: `rounded-xl` (12px) ili `rounded-2xl` (16px) za mekši izgled

---

### Korak 5: Responzivnost

**Breakpoints (Tailwind default):**
- `sm:` - 640px i više (tablet)
- `md:` - 768px i više (desktop)
- `lg:` - 1024px i više (veliki desktop)

**Planirane responzivne promjene:**

1. **Horizontalni padding scroll containera:**
   - Mobilni: `px-4` (1rem / 16px)
   - Tablet+: `sm:px-8` (2rem / 32px)

2. **Padding unutar papira:**
   - Mobilni: `p-8` (2rem / 32px)
   - Tablet: `sm:p-12` (3rem / 48px)
   - Desktop: `md:p-16` (4rem / 64px)

3. **Maksimalna širina papira:**
   - Mobilni: `max-w-full` (100% širine)
   - Tablet+: `max-w-3xl` (48rem / 768px)
   - Alternativa: `max-w-4xl` (56rem / 896px) za širi izgled

**Finalna responzivna struktura:**
```tsx
<div className="flex-1 overflow-y-auto bg-muted/50 py-8 px-4 sm:px-8">
  <div className="mx-auto w-full max-w-3xl bg-background rounded-lg shadow-lg min-h-full">
    <div className="p-8 sm:p-12 md:p-16">
      <EditorContent ... />
    </div>
  </div>
</div>
```

---

### Korak 6: Dodatna Poboljšanja (Opcijski)

**1. Smooth scrolling:**
- Dodati `scroll-smooth` na scroll container za glatko scrollanje

**2. Focus states:**
- Dodati suptilne focus indikatore na editor

**3. Print styles:**
- Dodati `@media print` stilove za printanje (ukloniti pozadinu, sjenu, itd.)

**4. Animacije:**
- Suptilne fade-in animacije pri učitavanju

**5. Custom scrollbar:**
- Stilizirati scrollbar da odgovara dizajnu

---

## Sažetak Koraka Implementacije

### Faza 1: Setup
1. ✅ Provjeriti Tailwind CSS v4 kompatibilnost s Typography pluginom
2. ✅ Instalirati `@tailwindcss/typography` ako je potrebno
3. ✅ Konfigurirati plugin (ako je potrebno JS config) ili CSS import

### Faza 2: Struktura
1. ✅ Modificirati `StudioEditor.tsx` strukturu
2. ✅ Dodati "papir" kontejner s centriranjem
3. ✅ Dodati responzivni padding

### Faza 3: Stiliziranje
1. ✅ Dodati pozadinu na scroll container
2. ✅ Dodati stilove na "papir" kontejner (sjena, zaobljeni rubovi)
3. ✅ Konfigurirati prose klase

### Faza 4: Responzivnost
1. ✅ Testirati na mobilnim uređajima
2. ✅ Podesiti breakpoints ako je potrebno
3. ✅ Optimizirati padding za različite veličine ekrana

### Faza 5: Testiranje
1. ✅ Testirati u light i dark modu
2. ✅ Provjeriti scroll ponašanje
3. ✅ Provjeriti tipografiju i čitljivost

---

## Potencijalni Problemi i Rješenja

### Problem 1: Tailwind Typography ne radi s v4
**Rješenje:** 
- Koristiti custom CSS implementaciju prose stilova
- Ili downgrade na Tailwind CSS v3 (ne preporučeno)

### Problem 2: Scroll ponašanje
**Rješenje:**
- Osigurati da `min-h-full` na papiru ne uzrokuje probleme
- Možda treba `min-h-[calc(100vh-...)]` umjesto `min-h-full`

### Problem 3: FloatingMenu pozicioniranje
**Rješenje:**
- FloatingMenu možda treba biti izvan papira kontejnera
- Provjeriti da li Tippy.js (koji koristi FloatingMenu) pravilno pozicionira elemente

### Problem 4: Dark mode boje
**Rješenje:**
- Koristiti design system boje (`bg-background`, `bg-muted`)
- Testirati kontrast u dark modu

---

## Finalna Struktura (Pregled)

```
StudioEditor
├── FloatingMenuUI (izvan papira)
└── Scroll Container (bg-muted/50, py-8, px-4 sm:px-8)
    └── Papir Kontejner (mx-auto, max-w-3xl, bg-background, rounded-lg, shadow-lg)
        └── Padding Container (p-8 sm:p-12 md:p-16)
            └── EditorContent (prose prose-lg prose-slate dark:prose-invert)
```

---

## CSS Klasa Reference

### Scroll Container
- `flex-1` - zauzima preostali prostor
- `overflow-y-auto` - vertikalni scroll
- `bg-muted/50` - svjetlija pozadina
- `py-8` - vertikalni padding
- `px-4 sm:px-8` - responzivni horizontalni padding

### Papir Kontejner
- `mx-auto` - centriranje
- `w-full` - puna širina na mobilnim
- `max-w-3xl` - maksimalna širina (768px)
- `bg-background` - pozadina papira
- `rounded-lg` - zaobljeni rubovi
- `shadow-lg` - sjena
- `min-h-full` - minimalna visina

### Padding Container
- `p-8 sm:p-12 md:p-16` - responzivni padding

### EditorContent
- `prose prose-lg` - Tailwind Typography
- `prose-slate` - boja teksta
- `dark:prose-invert` - dark mode
- `max-w-none` - uklanja prose max-width
- `focus:outline-none` - bez outline-a

