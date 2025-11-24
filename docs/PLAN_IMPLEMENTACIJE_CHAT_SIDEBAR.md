# Plan Implementacije: AI Chat Sidebar & Brainstorming Mod

Ovaj dokument prati napredak implementacije AI Chat Sidebara.

## Faza 1: Backend Priprema (API & Graph)
Cilj: Osigurati da backend može primiti `mode` parametar i ponašati se drugačije za Brainstorming.

- [ ] **Korak 1.1**: Ažurirati `ChatRequestBodySchema` u `server/src/schemas/validation.ts` da prihvaća `mode` ('planner' | 'brainstorming').
- [ ] **Korak 1.2**: Ažurirati `runStoryArchitectGraph` funkciju u `server/src/services/ai/graph/graph.ts` da prima `mode`.
- [ ] **Korak 1.3**: Ažurirati `AgentState` u `server/src/services/ai/graph/state.ts` da uključuje informaciju o modu.
- [ ] **Korak 1.4**: Ažurirati `api.ts` endpoint `/api/projects/:projectId/chat` da prosljeđuje `mode`.
- [ ] **Korak 1.5**: Prilagoditi `routeTaskNode` u `server/src/services/ai/graph/nodes.ts` da prepoznaje brainstorming mod i usmjerava flow.

## Faza 2: Frontend State Management
Cilj: Pripremiti store za upravljanje novim UI stanjem.

- [ ] **Korak 2.1**: Ažurirati `PlannerAIState` interface u `ui/src/stores/plannerAIStore.ts`.
    - Dodati `mode: 'planner' | 'brainstorming'`.
    - Dodati `pendingApplication: { field: string, value: any } | null`.
- [ ] **Korak 2.2**: Implementirati akcije `setMode`, `setPendingApplication`, `clearPendingApplication`.
- [ ] **Korak 2.3**: Ažurirati `sendMessage` funkciju da šalje `mode` backendu.

## Faza 3: UI Implementacija - Sidebar
Cilj: Izraditi vizualni dio sidebara.

- [ ] **Korak 3.1**: Kreirati novu komponentu `ui/src/components/planner/AIChatSidebar.tsx`.
    - Kopirati logiku iz `AIAssistantModal`.
    - Prilagoditi styling za sidebar (puna visina, border-left).
    - Dodati Header s Toggle gumbom za Mode (Planner/Brainstorming).
- [ ] **Korak 3.2**: Implementirati "Keep All" logiku koja koristi `setPendingApplication` umjesto callbacka.

## Faza 4: Integracija u Layout
Cilj: Postaviti sidebar u glavni layout aplikacije.

- [ ] **Korak 4.1**: Modificirati `ui/src/components/layout/ProjectLayout.tsx`.
    - Uvesti `AIChatSidebar`.
    - Dodati kondicionalni rendering: Prikazati sidebar ako je `isOpen` true.
    - Prilagoditi grid/flex layout da sidebar zauzima desni dio ekrana.

## Faza 5: Povezivanje s Formom
Cilj: Osigurati da gumbi u formi otvaraju sidebar i da "Keep All" radi.

- [ ] **Korak 5.1**: Modificirati `ui/src/components/IdeationForm.tsx`.
    - Zamijeniti `openModal` pozive s otvaranjem sidebara.
    - Dodati `useEffect` koji sluša `pendingApplication` iz store-a.
    - Kada se `pendingApplication` promijeni, ažurirati odgovarajuće polje forme i pozvati `clearPendingApplication`.
    - Ukloniti `AIAssistantModal` iz render metode.

## Faza 6: Čišćenje i Verifikacija
Cilj: Ukloniti stari kod i potvrditi ispravnost.

- [ ] **Korak 6.1**: Obrisati `ui/src/components/planner/AIAssistantModal.tsx` (nakon što smo sigurni da sve radi).
- [ ] **Korak 6.2**: Ručna verifikacija svih flow-ova (vidi Implementation Plan).
