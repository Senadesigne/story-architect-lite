# Plan za Popravak Studio Layouta (100vh Problem)

## Problem Analiza

**Trenutno stanje:**
- Korisnik mora scrollati cijelu stranicu da bi vidio CommandBar na dnu
- EditorContent (TipTap) ne poštuje overflow parent containera
- CommandBar nije eksplicitno fiksiran na dnu
- Sidebar možda ne koristi pravilno overflow kontrolu

**Uzrok problema:**
1. `EditorContent` komponenta iz TipTap-a renderira ProseMirror editor koji ima svoj vlastiti DOM i ne poštuje automatski `overflow-auto` parenta
2. Editor wrapper u `Studio.tsx` ima `flex-1 overflow-auto`, ali EditorContent unutar njega nema eksplicitnu visinu
3. CommandBar nema `flex-shrink-0`, što znači da može biti "gušen" ako editor zauzme previše prostora
4. Glavni kontejner možda treba `overflow-hidden` umjesto implicitnog overflow-a

## Tehnički Plan za Fiks

### Korak 1: Studio.tsx - Glavni kontejner i struktura

**Promjene:**
```tsx
// PRIJE:
<div className="flex h-[calc(100vh-3.5rem)]">
  {isSidebarOpen && <StudioSidebar projectId={projectId!} />}
  <div className="flex-1 flex flex-col">
    <div className="flex-1 overflow-auto">
      <StudioEditor ... />
    </div>
    <CommandBar projectId={projectId!} />
  </div>
</div>

// NAKON:
<div className="flex h-[calc(100vh-3.5rem)] overflow-hidden">
  {isSidebarOpen && <StudioSidebar projectId={projectId!} />}
  <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
    <div className="flex-1 min-h-0 overflow-y-auto">
      <StudioEditor ... />
    </div>
    <CommandBar projectId={projectId!} />
  </div>
</div>
```

**Objašnjenje:**
- `overflow-hidden` na glavnom kontejneru - sprječava scrollanje cijele stranice
- `min-h-0` na flex koloni - kritično za pravilno funkcioniranje `flex-1` u flex kontejnerima
- `overflow-hidden` na desnom dijelu - sprječava horizontalni overflow
- `min-h-0` na editor wrapperu - osigurava da `flex-1` pravilno radi
- `overflow-y-auto` umjesto `overflow-auto` - eksplicitno vertikalni scroll

### Korak 2: StudioEditor.tsx - EditorContent wrapper

**Promjene:**
```tsx
// PRIJE:
return (
  <>
    {editor && <FloatingMenuUI editor={editor} />}
    <EditorContent editor={editor} className="prose prose-lg max-w-none" />
  </>
);

// NAKON:
return (
  <div className="h-full flex flex-col">
    {editor && <FloatingMenuUI editor={editor} />}
    <div className="flex-1 overflow-y-auto">
      <EditorContent 
        editor={editor} 
        className="prose prose-lg max-w-none h-full min-h-full" 
      />
    </div>
  </div>
);
```

**Objašnjenje:**
- Wrapper div s `h-full flex flex-col` - osigurava da editor zauzme punu visinu parenta
- EditorContent wrapper s `flex-1 overflow-y-auto` - omogućava scrollanje editora
- `h-full min-h-full` na EditorContent - osigurava da editor zauzme punu visinu

**ALTERNATIVNO (jednostavnije rješenje):**
```tsx
return (
  <>
    {editor && <FloatingMenuUI editor={editor} />}
    <div className="h-full overflow-y-auto">
      <EditorContent 
        editor={editor} 
        className="prose prose-lg max-w-none" 
      />
    </div>
  </>
);
```

### Korak 3: CommandBar.tsx - Fiksiranje na dnu

**Promjene:**
```tsx
// PRIJE:
<div className="border-t bg-background p-4">

// NAKON:
<div className="flex-shrink-0 border-t bg-background p-4">
```

**Objašnjenje:**
- `flex-shrink-0` - sprječava da CommandBar bude "gušen" kada editor zauzme previše prostora
- CommandBar je već van editor wrappera, što je dobro

### Korak 4: StudioSidebar.tsx - Overflow kontrola

**Promjene:**
```tsx
// PRIJE:
<div className="w-64 h-full bg-background border-r border-border flex flex-col">

// NAKON:
<div className="w-64 h-full bg-background border-r border-border flex flex-col overflow-hidden">
```

**Objašnjenje:**
- `overflow-hidden` - sprječava da sidebar overflow utječe na glavni layout
- ScrollArea već ima `flex-1`, što je dobro

## CSS Klasa Reference (Tailwind)

### Glavni kontejner (Studio.tsx)
- `h-[calc(100vh-3.5rem)]` - fiksna visina (viewport minus header)
- `overflow-hidden` - sprječava scrollanje cijele stranice
- `flex` - horizontalni flex layout

### Desni dio (Studio.tsx)
- `flex-1` - zauzima preostali prostor
- `flex flex-col` - vertikalni flex layout
- `min-h-0` - **KRITIČNO** - omogućava flex-1 da pravilno radi
- `overflow-hidden` - sprječava overflow

### Editor wrapper (Studio.tsx)
- `flex-1` - zauzima preostali prostor (iznad CommandBar-a)
- `min-h-0` - **KRITIČNO** - omogućava flex-1 da pravilno radi
- `overflow-y-auto` - vertikalni scroll samo za editor

### EditorContent wrapper (StudioEditor.tsx)
- `h-full` - puna visina parenta
- `overflow-y-auto` - vertikalni scroll za editor sadržaj
- `flex flex-col` - vertikalni flex layout (ako koristimo FloatingMenu)

### CommandBar (CommandBar.tsx)
- `flex-shrink-0` - **KRITIČNO** - sprječava "gušenje" od strane editora
- `border-t` - gornji border za vizualno odvajanje

### Sidebar (StudioSidebar.tsx)
- `h-full` - puna visina parenta
- `overflow-hidden` - sprječava overflow
- `flex flex-col` - vertikalni flex layout

## Testiranje

Nakon implementacije, provjeriti:

1. ✅ CommandBar je uvijek vidljiv na dnu ekrana
2. ✅ Editor se scrolla unutar svog containera, ne cijela stranica
3. ✅ Sidebar se scrolla neovisno
4. ✅ Nema horizontalnog scrollanja
5. ✅ Layout radi na različitim veličinama ekrana
6. ✅ FloatingMenu se prikazuje pravilno unutar editora

## Napomene

- `min-h-0` je kritično za pravilno funkcioniranje `flex-1` u flex kontejnerima
- TipTap EditorContent možda treba dodatni wrapper za pravilno overflow ponašanje
- Ako FloatingMenu ima problema s pozicioniranjem, možda treba dodatni CSS

