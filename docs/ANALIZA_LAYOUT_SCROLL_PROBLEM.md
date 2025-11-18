# Detektivska Analiza: Zašto Stranica i Dalje Scrolla?

## Hijerarhija Elemenata (od vrha prema dnu)

```
index.html
├── <html> (NEMA height: 100%)
├── <body> (min-height: 100vh, NEMA height: 100%)
└── <div id="root"> (NEMA height: 100%)

App.tsx (AppContent)
└── <div className="flex flex-col w-full min-h-screen"> ⚠️ PROBLEM #1
    ├── <Navbar />
    └── <Routes>
        └── <ProjectLayout>

ProjectLayout.tsx
└── <div className="flex flex-col w-full min-h-screen"> ⚠️ PROBLEM #2
    ├── <ProjectNav> (h-14 = 3.5rem) ✅
    └── <div className="flex flex-1"> ⚠️ PROBLEM #3
        └── <div className="flex-1">
            └── {children} → ProjectPage

ProjectPage.tsx
└── <div className="container mx-auto p-6"> ⚠️ PROBLEM #4
    └── <Routes>
        └── <Studio />

Studio.tsx
└── <div className="flex h-[calc(100vh-3.5rem)] overflow-hidden"> ✅ (ali ne radi zbog parenta)
```

## Identificirani Problemi

### 🔴 PROBLEM #1: `html` i `body` nemaju `height: 100%`

**Lokacija:** `ui/src/index.css`

**Trenutno stanje:**
```css
html {
  transition: background-color 0.2s ease;
  /* NEMA height: 100% */
}

body {
  min-height: 100vh;  /* ⚠️ min-height omogućava proširenje izvan ekrana */
  overflow-x: hidden;
  transition: background-color 0.2s ease, color 0.2s ease;
  /* NEMA height: 100% */
}
```

**Zašto je problem:**
- `min-height: 100vh` znači "budi barem 100vh visok, ali možeš biti i viši"
- Kada dijete koristi `height: 100%`, traži visinu parenta, ali parent nema fiksnu visinu
- `#root` ne može naslijediti visinu jer `body` nema `height: 100%`

---

### 🔴 PROBLEM #2: `#root` nema eksplicitnu visinu

**Lokacija:** `ui/src/index.css`

**Trenutno stanje:**
- Nema CSS pravila za `#root`
- React mountira aplikaciju u `#root`, ali on nema ograničenje visine

**Zašto je problem:**
- Ako `#root` nema `height: 100%` ili `height: 100vh`, ne može ograničiti visinu svojih djece
- Flexbox elementi unutar `#root` mogu se proširiti izvan ekrana

---

### 🔴 PROBLEM #3: `App.tsx` koristi `min-h-screen` umjesto `h-screen`

**Lokacija:** `ui/src/App.tsx` (linija 33)

**Trenutno stanje:**
```tsx
<div className="flex flex-col w-full min-h-screen bg-background">
```

**Zašto je problem:**
- `min-h-screen` = "budi barem 100vh visok, ali možeš biti i viši"
- Ako sadržaj unutar ovog diva prelazi 100vh, div će se proširiti
- To omogućava scrollanje cijele stranice

**Rješenje:**
- Trebalo bi biti `h-screen` (fiksna visina) ili `h-full` (ako parent ima fiksnu visinu)

---

### 🔴 PROBLEM #4: `ProjectLayout.tsx` koristi `min-h-screen` umjesto `h-full`

**Lokacija:** `ui/src/components/layout/ProjectLayout.tsx` (linija 15)

**Trenutno stanje:**
```tsx
<div className="flex flex-col w-full min-h-screen">
```

**Zašto je problem:**
- Isti problem kao #3 - `min-h-screen` omogućava proširenje izvan ekrana
- Ova komponenta je unutar `App.tsx` koji već ima `min-h-screen`, što stvara "double min-height" problem

**Dodatni problem:**
- Linija 17: `<div className="flex flex-1">` - ovaj div nema `min-h-0`, što može uzrokovati probleme s flex-1

---

### 🔴 PROBLEM #5: `ProjectPage.tsx` wrapper div nema ograničenje visine

**Lokacija:** `ui/src/pages/ProjectPage.tsx` (linija 280)

**Trenutno stanje:**
```tsx
<div className="container mx-auto p-6">
  {/* ... */}
  <Routes>
    <Route path="studio" element={<Studio />} />
  </Routes>
</div>
```

**Zašto je problem:**
- Ovaj wrapper div nema `h-full` ili eksplicitnu visinu
- `Studio` komponenta koristi `h-[calc(100vh-3.5rem)]`, ali ako parent nije ograničen, može se proširiti
- Padding `p-6` dodatno povećava visinu sadržaja

**Dodatni problem:**
- Za Studio rutu, ovaj wrapper div je nepotreban i ometa layout

---

### 🟡 PROBLEM #6: `Studio.tsx` koristi viewport-relative visinu unutar neograničenog parenta

**Lokacija:** `ui/src/pages/Studio.tsx` (linija 32)

**Trenutno stanje:**
```tsx
<div className="flex h-[calc(100vh-3.5rem)] overflow-hidden">
```

**Zašto je problem:**
- `h-[calc(100vh-3.5rem)]` je relativno na viewport, ne na parent
- Ako parent (`ProjectPage` wrapper) nije ograničen na visinu ekrana, Studio može biti veći od viewporta
- `overflow-hidden` na Studio-u ne pomaže ako je parent veći od ekrana

---

## Gdje je Lanac Visine Prekinut?

### Prekid #1: `html` → `body`
- `html` nema `height: 100%`
- `body` ima samo `min-height: 100vh` (nema `height: 100%`)

### Prekid #2: `body` → `#root`
- `#root` nema eksplicitnu visinu (`height: 100%` ili `height: 100vh`)

### Prekid #3: `#root` → `App.tsx` glavni div
- `App.tsx` koristi `min-h-screen` umjesto `h-full` ili `h-screen`

### Prekid #4: `App.tsx` → `ProjectLayout.tsx`
- `ProjectLayout.tsx` koristi `min-h-screen` umjesto `h-full`

### Prekid #5: `ProjectLayout.tsx` → `ProjectPage.tsx`
- `ProjectPage.tsx` wrapper div nema `h-full` ili ograničenje visine

### Prekid #6: `ProjectPage.tsx` → `Studio.tsx`
- `Studio.tsx` koristi viewport-relative visinu umjesto parent-relative

---

## Koji Točno CSS Nedostaje na `html/body/#root` Razini?

### 1. `html` element
**Nedostaje:**
```css
html {
  height: 100%;
  /* ili */
  height: 100vh;
}
```

### 2. `body` element
**Nedostaje:**
```css
body {
  height: 100%;  /* umjesto samo min-height: 100vh */
  /* ili */
  height: 100vh;
  overflow: hidden;  /* sprječava scrollanje body-a */
}
```

### 3. `#root` element
**Nedostaje:**
```css
#root {
  height: 100%;
  /* ili */
  height: 100vh;
  display: flex;  /* ako koristimo flexbox */
  flex-direction: column;
}
```

---

## Plan za Popravak (3 Koraka)

### Korak 1: Popraviti Root Level (`index.css`)

**Dodati u `@layer base` ili direktno u CSS:**

```css
html {
  height: 100%;
  /* zadržati postojeće transition */
}

body {
  height: 100%;  /* PROMJENA: umjesto min-height: 100vh */
  overflow: hidden;  /* NOVO: sprječava scrollanje body-a */
  /* zadržati postojeće overflow-x: hidden i transition */
}

#root {
  height: 100%;
  display: flex;
  flex-direction: column;
}
```

**Objašnjenje:**
- `height: 100%` na `html` i `body` osigurava da elementi nasljeđuju visinu viewporta
- `overflow: hidden` na `body` sprječava scrollanje cijele stranice
- `#root` s `height: 100%` i flexbox osigurava da React aplikacija zauzme punu visinu

---

### Korak 2: Popraviti `App.tsx` i `ProjectLayout.tsx`

**U `App.tsx` (linija 33):**
```tsx
// PRIJE:
<div className="flex flex-col w-full min-h-screen bg-background">

// NAKON:
<div className="flex flex-col w-full h-full bg-background">
```

**U `ProjectLayout.tsx` (linija 15):**
```tsx
// PRIJE:
<div className="flex flex-col w-full min-h-screen">

// NAKON:
<div className="flex flex-col w-full h-full">
```

**U `ProjectLayout.tsx` (linija 17):**
```tsx
// PRIJE:
<div className="flex flex-1">

// NAKON:
<div className="flex flex-1 min-h-0">
```

**Objašnjenje:**
- `h-full` umjesto `min-h-screen` - nasljeđuje visinu parenta umjesto viewport-relative
- `min-h-0` na flex-1 elementu - kritično za pravilno funkcioniranje flex-1 u flex kontejnerima

---

### Korak 3: Popraviti `ProjectPage.tsx` za Studio rutu

**Opcija A: Dodati poseban wrapper za Studio**

```tsx
// U ProjectPage.tsx, modificirati Studio rutu:
<Route 
  path="studio" 
  element={
    <div className="h-full">
      <Studio />
    </div>
  } 
/>
```

**Opcija B: Ukloniti wrapper div za Studio (bolje rješenje)**

```tsx
// U ProjectPage.tsx, modificirati render logiku:
{location.pathname.includes('/studio') ? (
  <Routes>
    <Route path="studio" element={<Studio />} />
  </Routes>
) : (
  <div className="container mx-auto p-6">
    <div className="space-y-6">
      {/* postojeći sadržaj */}
    </div>
  </div>
)}
```

**U `Studio.tsx` (linija 32):**
```tsx
// PRIJE:
<div className="flex h-[calc(100vh-3.5rem)] overflow-hidden">

// NAKON:
<div className="flex h-full overflow-hidden">
```

**Objašnjenje:**
- `h-full` umjesto `h-[calc(100vh-3.5rem)]` - nasljeđuje visinu parenta
- ProjectNav već zauzima svoj prostor u ProjectLayout-u, pa Studio treba zauzeti preostali prostor

---

## Sažetak Problema

**Glavni uzrok:**
1. `html`, `body` i `#root` nemaju `height: 100%` - lanac visine je prekinut na samom početku
2. `min-h-screen` umjesto `h-full` na više mjesta - omogućava proširenje izvan ekrana
3. `ProjectPage.tsx` wrapper div ometa Studio layout - nepotreban padding i container

**Rješenje:**
1. Postaviti `height: 100%` na `html`, `body` i `#root`
2. Zamijeniti sve `min-h-screen` s `h-full` u layout komponentama
3. Ukloniti ili modificirati `ProjectPage.tsx` wrapper za Studio rutu

---

## Testiranje Nakon Popravka

Nakon implementacije, provjeriti:

1. ✅ Browser scrollbar ne postoji (ili je sakriven)
2. ✅ CommandBar je uvijek vidljiv na dnu ekrana
3. ✅ Editor se scrolla unutar svog containera
4. ✅ Layout radi na različitim veličinama ekrana
5. ✅ Nema horizontalnog scrollanja
6. ✅ Sidebar se scrolla neovisno

