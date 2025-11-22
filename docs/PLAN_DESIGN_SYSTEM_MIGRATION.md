# Tehnički Plan: Migracija na "Lovable/Literary" Design System

## 📋 Pregled

Ovaj dokument opisuje detaljni plan za migraciju aplikacije s trenutnog "default shadcn" dizajna na novi "Lovable/Literary" estetski stil koji karakteriziraju:
- Topli papir (warm parchment) pozadine
- Serif fontovi za elegantan literarni osjećaj
- Elegantne sjene i teksture
- Sepia i forest green akcenti

---

## 🎯 Ciljevi Migracije

1. **Zamjena boja**: OKLCH → HSL format s novim paletama
2. **Tipografija**: Uvođenje serif font stack-a
3. **Vizualni efekti**: Paper texture i elegantne sjene
4. **Kompatibilnost**: Očuvanje funkcionalnosti svih postojećih komponenti
5. **Dark mode**: Priprema za dark mode varijable (opcionalno)

---

## 📁 Datoteke koje će biti izmijenjene

### Primarne datoteke:
- `ui/src/index.css` - Glavni CSS fajl s varijablama i stilovima
- `ui/src/components/layout/ProjectLayout.tsx` - Layout komponenta
- `ui/src/components/ProjectSidebar.tsx` - Sidebar komponenta

### Sekundarne datoteke (provjera nakon migracije):
- `ui/src/components/ui/*.tsx` - Sve ShadCN komponente (automatski će koristiti nove varijable)
- `ui/src/components/navbar.tsx` - Navbar komponenta
- `ui/src/components/ProjectNav.tsx` - Project navigation
- `ui/src/pages/*.tsx` - Sve stranice
- Ostale komponente koje koriste Tailwind utility klase

---

## 🔧 Detaljni Koraci Implementacije

### **KORAK 1: Ažuriranje CSS Varijabli u `index.css`**

#### 1.1 Zamjena OKLCH boja s HSL bojama

**Lokacija:** `ui/src/index.css` (linije 7-45)

**Akcija:**
- Zamijeniti sve `oklch()` vrijednosti s HSL formatom
- Ažurirati `:root` sekciju s novim HSL vrijednostima iz predloška
- Zadržati strukturu `@theme inline` sekcije (linije 111-147)

**Nove varijable za `:root`:**
```css
:root {
  font-synthesis: none;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  --radius: 0.75rem; /* Promijenjeno s 0.5rem */
  
  /* Warm parchment background */
  --background: 40 30% 97%;
  --foreground: 25 25% 15%;
  
  /* Cards */
  --card: 40 25% 98%;
  --card-foreground: 25 25% 15%;
  --popover: 40 25% 98%;
  --popover-foreground: 25 25% 15%;
  
  /* Deep forest green */
  --primary: 155 35% 25%;
  --primary-foreground: 40 30% 97%;
  
  /* Warm sepia accent */
  --secondary: 35 40% 88%;
  --secondary-foreground: 25 35% 20%;
  
  /* Muted */
  --muted: 35 25% 92%;
  --muted-foreground: 25 15% 45%;
  
  /* Accent */
  --accent: 0 40% 45%;
  --accent-foreground: 40 30% 97%;
  --destructive: 0 70% 50%;
  --destructive-foreground: 40 30% 97%;
  
  /* Borders & Ring */
  --border: 35 20% 85%;
  --input: 35 20% 90%;
  --ring: 155 35% 25%;
  
  /* Chart colors (zadržati postojeće ili prilagoditi) */
  --chart-1: 155 35% 45%;
  --chart-2: 35 40% 60%;
  --chart-3: 0 40% 55%;
  --chart-4: 25 30% 50%;
  --chart-5: 155 30% 40%;
  
  /* Sidebar specific */
  --sidebar-background: 0 0% 98%;
  --sidebar-foreground: 240 5.3% 26.1%;
  --sidebar-primary: 240 5.9% 10%;
  --sidebar-primary-foreground: 0 0% 98%;
  --sidebar-accent: 240 4.8% 95.9%;
  --sidebar-accent-foreground: 240 5.9% 10%;
  --sidebar-border: 220 13% 91%;
  --sidebar-ring: 217.2 91.2% 59.8%;
  
  /* Texture & Shadows */
  --paper-texture: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><filter id="noise"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="4" stitchTiles="stitch"/></filter><rect width="400" height="400" filter="url(%23noise)" opacity="0.03"/></svg>');
  --shadow-card: 0 2px 8px -2px hsl(25 25% 15% / 0.08), 0 4px 16px -4px hsl(25 25% 15% / 0.06);
}
```

**Napomene:**
- HSL format u Tailwind CSS v4 koristi samo vrijednosti bez `hsl()` wrappera
- Varijable se koriste kao `hsl(var(--background))` u Tailwind utility klasama
- `--radius` se mijenja s `0.5rem` na `0.75rem` za mekše, elegantnije rubove

#### 1.2 Dodavanje Paper Texture i Shadow Varijabli

**Lokacija:** `ui/src/index.css` (nakon `:root` sekcije)

**Akcija:**
- Dodati nove CSS custom properties za texture i shadows
- Integrirati ih u `@theme inline` sekciju ako je potrebno

**Napomene:**
- `--paper-texture` je SVG data URI koji se može koristiti kao `background-image`
- `--shadow-card` je custom shadow definicija za elegantne sjene

#### 1.3 Dark Mode Varijable (Opcionalno - za budućnost)

**Lokacija:** `ui/src/index.css` (linije 47-79)

**Akcija:**
- Privremeno zadržati postojeće dark mode varijable
- Ili kreirati nove dark mode varijable u skladu s literary temom
- Ako se dark mode ne koristi aktivno, možemo ih komentirati

**Preporuka:**
- Za sada zadržati postojeće dark mode varijable
- Kasnije kreirati literary-themed dark mode varijable ako bude potrebno

---

### **KORAK 2: Uvođenje Serif Tipografije**

#### 2.1 Font Stack Konfiguracija

**Lokacija:** `ui/src/index.css` (u `@layer base` sekciji ili kao novi layer)

**Akcija:**
- Dodati serif font stack u `body` stilove
- Koristiti web-safe serif fontove ili Google Fonts

**Opcija A: Web-safe serif fontovi (bez vanjskih ovisnosti):**
```css
@layer base {
  * {
    @apply border-border outline-ring/50;
  }
  body {
    @apply bg-background text-foreground;
    font-family: 'Georgia', 'Times New Roman', 'Times', serif;
  }
  
  /* Sans-serif za UI elemente (opcionalno) */
  button, input, select, textarea, [role="button"] {
    font-family: ui-sans-serif, system-ui, sans-serif;
  }
}
```

**Opcija B: Google Fonts (elegantniji izbor):**
```css
/* Na vrhu index.css, prije @import "tailwindcss" */
@import url('https://fonts.googleapis.com/css2?family=Crimson+Text:ital,wght@0,400;0,600;1,400&family=Lora:ital,wght@0,400;0,600;1,400&display=swap');

@layer base {
  body {
    @apply bg-background text-foreground;
    font-family: 'Crimson Text', 'Lora', 'Georgia', serif;
  }
  
  /* UI elementi mogu koristiti sans-serif za bolju čitljivost */
  button, input, select, textarea, [role="button"], .ui-element {
    font-family: ui-sans-serif, system-ui, sans-serif;
  }
}
```

**Preporuka:**
- Početi s Opcijom A (web-safe) za bržu implementaciju
- Kasnije dodati Google Fonts ako je potrebno elegantnije rješenje

#### 2.2 Tailwind Typography Plugin Prilagodba

**Lokacija:** `ui/src/index.css` (već postoji `@plugin "@tailwindcss/typography"`)

**Akcija:**
- Provjeriti da li prose stilovi trebaju prilagodbu za serif fontove
- Možda dodati custom prose varijante za literary stil

**Napomene:**
- Tailwind Typography plugin već postoji u projektu
- Prose klase automatski koriste body font-family
- Možda treba customizirati prose spacing i veličine za book-like osjećaj

---

### **KORAK 3: Implementacija Paper Texture Efekta**

#### 3.1 Background Texture za Glavne Kontejnere

**Lokacija:** `ui/src/index.css` (u `@layer base` ili `@layer components`)

**Akcija:**
- Dodati paper texture na body ili glavne kontejnere
- Koristiti `--paper-texture` varijablu

**Implementacija:**
```css
@layer base {
  body {
    @apply bg-background text-foreground;
    background-image: var(--paper-texture);
    background-attachment: fixed; /* Opcionalno - za fiksnu teksturu */
  }
  
  /* Alternativno: samo na card elementima */
  .paper-surface {
    background-image: var(--paper-texture);
    background-size: 400px 400px;
  }
}
```

**Napomene:**
- Texture je vrlo subtilna (opacity: 0.03), tako da neće ometati čitljivost
- `background-attachment: fixed` može uzrokovati performance probleme na mobilnim uređajima
- Preporuka: koristiti texture samo na glavnim kontejnerima, ne na svim elementima

#### 3.2 Custom Shadow Klase

**Lokacija:** `ui/src/index.css` (u `@layer components` ili `@theme inline`)

**Akcija:**
- Kreirati utility klasu za elegantne card shadows
- Koristiti `--shadow-card` varijablu

**Implementacija:**
```css
@layer components {
  .shadow-card {
    box-shadow: var(--shadow-card);
  }
  
  /* Ažurirati Card komponentu da koristi ovu klasu */
}
```

**Ili u Tailwind v4 formatu:**
```css
@theme inline {
  /* Dodati nakon postojećih shadow varijabli */
  --shadow-card: 0 2px 8px -2px hsl(25 25% 15% / 0.08), 0 4px 16px -4px hsl(25 25% 15% / 0.06);
}
```

---

### **KORAK 4: Ažuriranje Komponenti**

#### 4.1 Card Komponenta

**Lokacija:** `ui/src/components/ui/card.tsx`

**Akcija:**
- Provjeriti da li Card komponenta automatski koristi nove varijable (trebala bi)
- Možda dodati `shadow-card` klasu ako je potrebno
- Provjeriti da li treba paper texture na card elementima

**Trenutno stanje:**
```tsx
className={cn(
  "rounded-lg border bg-card text-card-foreground shadow-sm",
  className
)}
```

**Moguće promjene:**
- Zamijeniti `shadow-sm` s `shadow-card` ako je kreirana custom klasa
- Dodati `paper-surface` klasu ako je texture potreban na card elementima

#### 4.2 ProjectSidebar Komponenta

**Lokacija:** `ui/src/components/ProjectSidebar.tsx`

**Akcija:**
- Provjeriti da li sidebar koristi nove sidebar varijable (automatski će)
- Možda prilagoditi boje ako sidebar treba drugačiji izgled

**Trenutno stanje:**
```tsx
<div className="w-64 h-screen bg-background border-r border-border sticky top-0 overflow-y-auto">
```

**Napomene:**
- Sidebar već koristi `bg-background` i `border-border`, što će automatski koristiti nove varijable
- Možda treba eksplicitno koristiti `bg-sidebar-background` ako je definiran

#### 4.3 ProjectLayout Komponenta

**Lokacija:** `ui/src/components/layout/ProjectLayout.tsx`

**Akcija:**
- Provjeriti da li layout treba dodatne stilove
- Možda dodati paper texture na glavni kontejner

**Trenutno stanje:**
```tsx
<div className="flex flex-col w-full h-full">
```

**Napomene:**
- Layout je minimalistički i ne treba direktne promjene
- Texture će se primijeniti preko body elementa

---

### **KORAK 5: Provjera Kompatibilnosti**

#### 5.1 ShadCN Komponente

**Akcije:**
- Sve ShadCN komponente automatski koriste CSS varijable
- Provjeriti svaku komponentu nakon migracije:
  - Button
  - Card
  - Input
  - Dialog
  - Dropdown Menu
  - Navigation Menu
  - Sidebar (ako se koristi)
  - Ostale komponente u `ui/src/components/ui/`

**Test scenariji:**
1. Svi button varijanti (default, outline, secondary, destructive, ghost, link)
2. Card komponente s različitim sadržajem
3. Form elementi (Input, Textarea, Checkbox, Radio)
4. Dialog i Modal komponente
5. Navigation elementi
6. Sidebar komponente

#### 5.2 Stranice i Layout Komponente

**Akcije:**
- Provjeriti sve stranice u `ui/src/pages/`
- Provjeriti layout komponente:
  - MainLayout
  - ProjectLayout
  - Navbar
  - ProjectNav
  - ProjectSidebar

**Test scenariji:**
1. Home stranica
2. Project stranice (sve faze)
3. Studio stranica
4. Settings stranica
5. Login/Register forme

#### 5.3 Tipografija i Čitljivost

**Akcije:**
- Provjeriti da li serif fontovi dobro funkcioniraju na svim elementima
- Provjeriti kontrast boja (WCAG compliance)
- Provjeriti čitljivost na različitim veličinama ekrana

**Test scenariji:**
1. Dugi tekstovi (editor, forme)
2. Naslovi i podnaslovi
3. UI elementi (buttoni, linkovi)
4. Mobilni prikaz
5. Različite rezolucije ekrana

---

## 🔍 Detaljna Analiza Promjena

### Boje - Mapping OKLCH → HSL

| Varijabla | Stara (OKLCH) | Nova (HSL) | Opis |
|-----------|---------------|------------|------|
| `--background` | `oklch(1 0 0)` | `40 30% 97%` | Warm parchment |
| `--foreground` | `oklch(0.141 0.005 285.823)` | `25 25% 15%` | Dark text |
| `--primary` | `oklch(0.21 0.006 285.885)` | `155 35% 25%` | Deep forest green |
| `--secondary` | `oklch(0.967 0.001 286.375)` | `35 40% 88%` | Warm sepia |
| `--muted` | `oklch(0.967 0.001 286.375)` | `35 25% 92%` | Muted sepia |
| `--accent` | `oklch(0.967 0.001 286.375)` | `0 40% 45%` | Warm red accent |
| `--border` | `oklch(0.92 0.004 286.32)` | `35 20% 85%` | Sepia border |
| `--radius` | `0.5rem` | `0.75rem` | Veći border radius |

### Tipografija

| Element | Stari Font | Novi Font | Napomena |
|---------|------------|-----------|----------|
| Body | System default | Georgia/Times serif | Literary osjećaj |
| UI elementi | System default | Sans-serif | Bolja čitljivost za UI |

### Vizualni Efekti

| Element | Stari | Novi | Implementacija |
|---------|-------|------|----------------|
| Background | Čista boja | Paper texture | `--paper-texture` varijabla |
| Card shadows | `shadow-sm` | Custom elegant shadows | `--shadow-card` varijabla |
| Border radius | `0.5rem` | `0.75rem` | Veći radius za mekši izgled |

---

## ⚠️ Potencijalni Problemi i Rješenja

### Problem 1: HSL Format u Tailwind CSS v4

**Problem:**
- Tailwind CSS v4 možda očekuje drugačiji format za HSL varijable
- Možda treba `hsl()` wrapper ili drugačiji sintaksis

**Rješenje:**
- Provjeriti Tailwind CSS v4 dokumentaciju za HSL format
- Ako ne radi, možda treba koristiti format: `--background: hsl(40, 30%, 97%)`
- Ili možda Tailwind v4 automatski parsira HSL format

**Test:**
- Nakon implementacije, provjeriti da li `bg-background` klasa radi ispravno

### Problem 2: Paper Texture Performance

**Problem:**
- SVG texture može uzrokovati performance probleme
- `background-attachment: fixed` je problematičan na mobilnim uređajima

**Rješenje:**
- Koristiti texture samo na glavnim kontejnerima
- Izbjegavati `background-attachment: fixed`
- Možda koristiti CSS `::before` pseudo-element za bolju performance
- Alternativa: koristiti CSS `background-image` s `repeating-linear-gradient` za jednostavniju teksturu

### Problem 3: Serif Fontovi na UI Elementima

**Problem:**
- Serif fontovi možda nisu optimalni za button, input i druge UI elemente
- Možda izgledaju neprofesionalno ili teško čitljivo

**Rješenje:**
- Koristiti serif samo za body tekst i sadržaj
- UI elementi koriste sans-serif font stack
- Definirajte jasne pravila za koje elemente koristiti koji font

### Problem 4: Kontrast Boja

**Problem:**
- Nove boje možda nemaju dovoljno kontrasta za WCAG compliance
- Sepia tonovi možda nisu dovoljno kontrastni

**Rješenje:**
- Provjeriti kontrast svih kombinacija boja
- Koristiti alate poput WebAIM Contrast Checker
- Prilagoditi boje ako je potrebno za bolji kontrast

### Problem 5: Dark Mode Kompatibilnost

**Problem:**
- Dark mode varijable nisu definirane u novom dizajnu
- Ako aplikacija koristi dark mode, trebaju nove varijable

**Rješenje:**
- Privremeno zadržati postojeće dark mode varijable
- Ili kreirati nove literary-themed dark mode varijable
- Možda dark mode nije potreban za literary estetiku

---

## 📝 Checklist Implementacije

### Faza 1: CSS Varijable
- [ ] Zamijeniti OKLCH boje s HSL u `:root` sekciji
- [ ] Ažurirati `--radius` s `0.5rem` na `0.75rem`
- [ ] Dodati `--paper-texture` varijablu
- [ ] Dodati `--shadow-card` varijablu
- [ ] Ažurirati sidebar varijable (ako je potrebno)
- [ ] Provjeriti `@theme inline` sekciju

### Faza 2: Tipografija
- [ ] Odabrati font stack (web-safe ili Google Fonts)
- [ ] Dodati serif font u `body` stilove
- [ ] Definirati sans-serif za UI elemente
- [ ] Provjeriti Tailwind Typography plugin kompatibilnost

### Faza 3: Vizualni Efekti
- [ ] Implementirati paper texture na body ili glavne kontejnere
- [ ] Kreirati `shadow-card` utility klasu
- [ ] Ažurirati Card komponentu da koristi novu shadow klasu (ako je potrebno)

### Faza 4: Komponente
- [ ] Provjeriti Card komponentu
- [ ] Provjeriti Button komponentu
- [ ] Provjeriti Input komponentu
- [ ] Provjeriti ProjectSidebar komponentu
- [ ] Provjeriti ProjectLayout komponentu
- [ ] Provjeriti Navbar komponentu
- [ ] Provjeriti sve ostale ShadCN komponente

### Faza 5: Testiranje
- [ ] Testirati sve stranice
- [ ] Testirati sve forme
- [ ] Testirati editor (Studio)
- [ ] Testirati dark mode (ako se koristi)
- [ ] Testirati mobilni prikaz
- [ ] Provjeriti kontrast boja (WCAG)
- [ ] Provjeriti performance (texture, shadows)

### Faza 6: Dokumentacija
- [ ] Dokumentirati nove varijable
- [ ] Dokumentirati font stack odluke
- [ ] Ažurirati README ako je potrebno

---

## 🎨 Vizualni Reference

### Boje Paleta

**Primarne boje:**
- Background: Warm parchment (`hsl(40, 30%, 97%)`)
- Foreground: Dark text (`hsl(25, 25%, 15%)`)
- Primary: Deep forest green (`hsl(155, 35%, 25%)`)

**Akcent boje:**
- Secondary: Warm sepia (`hsl(35, 40%, 88%)`)
- Accent: Warm red (`hsl(0, 40%, 45%)`)
- Muted: Light sepia (`hsl(35, 25%, 92%)`)

**Borders:**
- Border: Sepia border (`hsl(35, 20%, 85%)`)
- Input: Light sepia border (`hsl(35, 20%, 90%)`)

### Tipografija

**Serif font stack:**
- Primary: Georgia, Times New Roman, Times, serif
- Alternativa: Crimson Text, Lora (Google Fonts)

**Sans-serif za UI:**
- System UI font stack za buttone, inpute i druge interaktivne elemente

---

## 🔄 Rollback Plan

Ako migracija uzrokuje probleme:

1. **Git revert:**
   ```bash
   git revert <commit-hash>
   ```

2. **Ručni rollback:**
   - Vratiti stare OKLCH vrijednosti u `index.css`
   - Ukloniti serif fontove
   - Ukloniti paper texture
   - Vratiti stare shadow vrijednosti

3. **Postepeni rollback:**
   - Zadržati nove boje, ali ukloniti texture ako uzrokuje probleme
   - Zadržati serif fontove, ali vratiti stare boje ako je potrebno

---

## 📚 Dodatne Napomene

### Tailwind CSS v4 Specifičnosti

- Tailwind CSS v4 koristi CSS-based konfiguraciju umjesto JS config fajla
- Varijable se definiraju direktno u CSS-u
- `@theme inline` sekcija mapira CSS varijable na Tailwind utility klase
- HSL format možda treba biti bez `hsl()` wrappera (samo vrijednosti)

### ShadCN Komponente

- Sve ShadCN komponente automatski koriste CSS varijable
- Nema potrebe za direktnim mijenjanjem komponenti
- Komponente će automatski primiti nove boje i stilove

### Performance Considerations

- Paper texture je SVG data URI, što je efikasno
- Texture opacity je vrlo niska (0.03), tako da neće značajno utjecati na performance
- Shadows su optimizirane s blur i spread vrijednostima
- Font loading: Google Fonts dodaje vanjski request, web-safe fontovi ne

---

## ✅ Kriteriji Uspjeha

Migracija je uspješna ako:

1. ✅ Sve boje su zamijenjene s novim HSL vrijednostima
2. ✅ Serif fontovi su primijenjeni na body tekst
3. ✅ Paper texture je vidljiv na glavnim kontejnerima
4. ✅ Elegantne sjene su primijenjene na card elementima
5. ✅ Sve komponente funkcioniraju bez grešaka
6. ✅ Kontrast boja zadovoljava WCAG standarde
7. ✅ Aplikacija izgleda "literary" i elegantno
8. ✅ Performance nije značajno pogoršan

---

## 🚀 Sljedeći Koraci Nakon Migracije

1. **User Testing:**
   - Prikupiti feedback od korisnika
   - Provjeriti da li dizajn odgovara očekivanjima

2. **Fine-tuning:**
   - Prilagoditi boje ako je potrebno
   - Prilagoditi font veličine
   - Prilagoditi spacing i padding

3. **Dark Mode (opcionalno):**
   - Kreirati literary-themed dark mode varijable
   - Implementirati dark mode toggle

4. **Dokumentacija:**
   - Ažurirati dizajn dokumentaciju
   - Kreirati style guide za buduće promjene

---

---

## 📊 ANALIZA TRENUTNOG STANJA vs CILJANI DIZAJN

### **Planer Mod - Analiza Razlika**

#### ✅ Što je već implementirano:
- CSS varijable (HSL boje) ✓
- Paper texture na body ✓
- Serif fontovi za body tekst ✓
- Shadow-card na Card komponenti ✓
- Prozirne pozadine na navbar i ProjectNav ✓
- Omekšani borderi ✓

#### ❌ Što još nedostaje (prema Slika 1 vs Slika 2):

**1. ProjectPage Layout (`ui/src/pages/ProjectPage.tsx`):**
- **Problem:** `container mx-auto p-6` wrapper možda ima previše neprozirnu pozadinu
- **Trenutno:** `<div className="container mx-auto p-6">` - možda blokira teksturu
- **Ciljano:** Prozirna pozadina ili `bg-background/80` da se tekstura vidi
- **Predloženo:** Dodati `bg-transparent` ili `bg-background/80` na container wrapper

**2. Project Header Sekcija:**
- **Problem:** Naslov projekta (`<h1>`) možda treba serif font za literary osjećaj
- **Trenutno:** Koristi default font (možda sans-serif)
- **Ciljano:** Serif font za naslov projekta (kao u Slika 2)
- **Predloženo:** Dodati serif font klasu na `<h1>` element u ProjectPage

**3. Form Komponente (IdeationForm, Phase2Form, itd.):**
- **Problem:** Textarea i Input elementi možda trebaju serif fontove za uneseni tekst
- **Trenutno:** UI elementi koriste sans-serif (što je OK za UI), ali možda sadržaj treba serif
- **Ciljano:** Serif fontovi za uneseni tekst u formama (kao u Slika 2)
- **Predloženo:** 
  - Textarea komponenta - dodati serif font za uneseni tekst
  - Input komponenta - možda zadržati sans-serif (kraći tekst)
  - Label komponenta - zadržati sans-serif (UI element)

**4. Card Title i Content:**
- **Problem:** CardTitle možda treba serif font
- **Trenutno:** `CardTitle` koristi default font
- **Ciljano:** Serif font za naslove sekcija (npr. "Faza 1: Ideja i Koncept")
- **Predloženo:** Dodati serif font klasu na `CardTitle` komponentu ili specifične instance

**5. Save Indicator Tekst:**
- **Problem:** Save indicator možda koristi hardkodirane boje (`text-gray-500`)
- **Trenutno:** `text-gray-500` u ProjectPage.tsx (linija 211)
- **Ciljano:** Koristiti semantičke varijable (`text-muted-foreground`)
- **Predloženo:** Zamijeniti `text-gray-500` s `text-muted-foreground`

---

### **Studio Mod - Analiza Razlika**

#### ✅ Što je već implementirano:
- Shadow-card na StudioEditor kontejneru ✓
- Paper texture vidljiv kroz prozirne pozadine ✓

#### ❌ Što još nedostaje (prema Slika 3 vs Slika 4):

**1. StudioSidebar - Scene Lista:**
- **Problem:** Scene tekst koristi sans-serif font
- **Trenutno:** Scene naslovi i summary koriste default font (sans-serif)
- **Ciljano:** Serif fontovi za scene tekst (kao u Slika 3 - "uvod", "Scena 2", itd.)
- **Predloženo:** 
  - Dodati serif font klasu na scene naslove (`scene.title`)
  - Dodati serif font klasu na scene summary tekst
  - Zadržati sans-serif za UI elemente (brojevi, ikone)

**2. StudioSidebar - Header:**
- **Problem:** "Scene" naslov možda treba serif font
- **Trenutno:** Koristi `text-sm font-semibold` (sans-serif)
- **Ciljano:** Možda serif font za "Scene" naslov (ili zadržati sans-serif za UI)
- **Predloženo:** Provjeriti dizajn - možda zadržati sans-serif za header (UI element)

**3. StudioEditor - Editor Content:**
- **Problem:** Editor content već koristi prose klase, ali možda treba dodatne prilagodbe
- **Trenutno:** `prose prose-lg prose-slate` - već koristi serif preko body fonta
- **Ciljano:** Serif fontovi za editor sadržaj (već implementirano preko prose)
- **Status:** ✓ Već implementirano

**4. CommandBar:**
- **Problem:** CommandBar možda treba prozirnu pozadinu
- **Trenutno:** `bg-background` - možda previše neprozirna
- **Ciljano:** Prozirna pozadina da se tekstura vidi
- **Predloženo:** Dodati `bg-background/80 backdrop-blur-sm` ili `bg-transparent`

**5. StudioSidebar - Background:**
- **Problem:** Sidebar možda treba prozirniju pozadinu
- **Trenutno:** `bg-background` - možda previše neprozirna
- **Ciljano:** Prozirna pozadina s backdrop blur (kao ProjectSidebar)
- **Predloženo:** Dodati `bg-sidebar-background/95 backdrop-blur-sm` i `border-border/50`

---

## 🔄 PREDLOŽENE DODATNE PROMJENE U PLANU

### **FAZA 5: Planer Mod - Tipografija i Layout Prilagodbe**

#### 5.1 ProjectPage Layout Prilagodbe

**Lokacija:** `ui/src/pages/ProjectPage.tsx`

**Akcije:**
1. **Container Wrapper:**
   - Zamijeniti ili dodati `bg-transparent` ili `bg-background/80` na container wrapper
   - Osigurati da tekstura papira bude vidljiva

2. **Project Header:**
   - Dodati serif font klasu na `<h1>` element s naslovom projekta
   - Možda dodati `font-serif` ili custom klasu

3. **Save Indicator:**
   - Zamijeniti `text-gray-500` s `text-muted-foreground` (linija 211)
   - Osigurati konzistentno korištenje semantičkih varijabli

#### 5.2 Form Komponente - Tipografija

**Lokacije:** 
- `ui/src/components/IdeationForm.tsx`
- `ui/src/components/Phase2Form.tsx`
- `ui/src/components/Phase3Form.tsx`
- `ui/src/components/Phase4Form.tsx`
- `ui/src/components/Phase5Form.tsx`
- `ui/src/components/Phase6Form.tsx`

**Akcije:**
1. **Textarea Komponenta:**
   - Provjeriti `ui/src/components/ui/textarea.tsx`
   - Dodati serif font klasu za uneseni tekst
   - Možda koristiti `font-serif` ili custom klasu

2. **CardTitle:**
   - Provjeriti `ui/src/components/ui/card.tsx`
   - Dodati serif font klasu na `CardTitle` komponentu
   - Ili dodati serif klasu na specifične instance u formama

3. **Label Komponenta:**
   - Zadržati sans-serif (UI element)
   - Provjeriti da koristi semantičke varijable

#### 5.3 Input Komponenta

**Lokacija:** `ui/src/components/ui/input.tsx`

**Akcije:**
- Provjeriti da li Input treba serif font ili zadržati sans-serif
- Prema Slika 2, Input polja koriste serif font za uneseni tekst
- Predloženo: Dodati serif font klasu na Input komponentu

---

### **FAZA 6: Studio Mod - Tipografija i Layout Prilagodbe**

#### 6.1 StudioSidebar Prilagodbe

**Lokacija:** `ui/src/components/studio/StudioSidebar.tsx`

**Akcije:**
1. **Background i Border:**
   - Zamijeniti `bg-background` s `bg-sidebar-background/95 backdrop-blur-sm`
   - Zamijeniti `border-border` s `border-border/50`
   - Dodati prozirnost za vidljivost teksture

2. **Scene Lista - Tipografija:**
   - Dodati serif font klasu na scene naslove (`scene.title`)
   - Dodati serif font klasu na scene summary tekst
   - Zadržati sans-serif za brojeve i UI elemente

3. **Scene Button Stilovi:**
   - Provjeriti aktivno stanje - koristiti sidebar varijable
   - Možda prilagoditi hover efekte

#### 6.2 CommandBar Prilagodbe

**Lokacija:** `ui/src/components/studio/CommandBar.tsx`

**Akcije:**
1. **Background:**
   - Zamijeniti `bg-background` s `bg-background/80 backdrop-blur-sm`
   - Dodati `border-border/50` na border-t

2. **Input Stilovi:**
   - Provjeriti da Input koristi serif font (ako je potrebno)
   - Osigurati konzistentnost s ostatkom aplikacije

---

### **FAZA 7: Dodatne Komponente - Hardkodirane Boje**

#### 7.1 Skeniranje i Zamjena Hardkodiranih Boja

**Lokacije:** Sve komponente u `ui/src/components/`

**Akcije:**
1. **Skenirati za:**
   - `bg-white` → `bg-background` ili `bg-card`
   - `text-gray-*` → `text-muted-foreground` ili `text-foreground`
   - `bg-gray-*` → `bg-muted` ili `bg-background`
   - `shadow-lg` → `shadow-card` (gdje je prikladno)
   - `shadow-md` → `shadow-card` (gdje je prikladno)

2. **Specifične Komponente:**
   - `StudioSidebar.tsx` - provjeriti error display (`bg-red-50`, `text-red-600`)
   - `ProjectPage.tsx` - provjeriti error display (`text-red-500`)
   - `login-form.tsx` - provjeriti hardkodirane boje (`bg-white`, `text-gray-900`)

---

## 📝 AŽURIRANI CHECKLIST IMPLEMENTACIJE

### Faza 5: Planer Mod Prilagodbe
- [ ] Ažurirati ProjectPage container wrapper s prozirnom pozadinom
- [ ] Dodati serif font na project header (`<h1>`)
- [ ] Zamijeniti `text-gray-500` s `text-muted-foreground` u save indicator
- [ ] Dodati serif font na Textarea komponentu
- [ ] Dodati serif font na CardTitle komponentu
- [ ] Provjeriti Input komponentu - dodati serif font ako je potrebno

### Faza 6: Studio Mod Prilagodbe
- [ ] Ažurirati StudioSidebar background s prozirnom pozadinom
- [ ] Dodati serif font na scene naslove
- [ ] Dodati serif font na scene summary tekst
- [ ] Ažurirati CommandBar s prozirnom pozadinom
- [ ] Provjeriti aktivno stanje scene buttona

### Faza 7: Cleanup Hardkodiranih Boja
- [ ] Skenirati sve komponente za hardkodirane boje
- [ ] Zamijeniti `bg-white` s semantičkim varijablama
- [ ] Zamijeniti `text-gray-*` s semantičkim varijablama
- [ ] Zamijeniti `bg-gray-*` s semantičkim varijablama
- [ ] Zamijeniti `shadow-lg`/`shadow-md` s `shadow-card` gdje je prikladno
- [ ] Provjeriti error display komponente

---

**Datum kreiranja:** 2025-01-27  
**Datum ažuriranja:** 2025-01-27  
**Verzija:** 1.1  
**Status:** Plan - Djelomično implementirano (Faze 1-4), Faze 5-7 predložene

