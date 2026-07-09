# QC Defect Logger · MyCar Pro Smart Factory

SPA for factory quality control (ОТК). An inspector rotates a 3D car model,
clicks a spot on the body, fills in a defect card, and manages the defect list
through a status lifecycle. Everything lives in frontend memory: **no backend, no
persistence, no API** (hard scope boundary; refreshing the page clears the data).

Stack: Vue 3 + TypeScript (Composition API, `<script setup>`), Vite, Vitest,
Three.js for the 3D body view. No Pinia, no router, no UI libraries.

## Install and run

```bash
npm install        # one time
npm run dev        # dev server → http://localhost:5173
npm test           # unit tests, single run
npm run test:watch # unit tests, watch mode
npm run build      # type-check (vue-tsc) + production build into dist/
```

Requires Node.js 18+ (LTS recommended).

## How to use

1. Set the body VIN in the summary bar (defects are scoped per body).
2. Drag to rotate the car (wheel = zoom). Click a spot on the body: a red
   draft marker appears there and the card opens with the zone prefilled.
3. Pick a defect type and zone (both required; save is blocked with visible
   messages otherwise), optionally severity and comment. Save.
4. The marker becomes a colored dot (color = status) and a row appears in the
   list. Click any marker or row to open its card.
5. Change status with the transition buttons. Only legal moves are shown:

   | from \ to  | новый | в ремонте | устранён | отклонён |
   |------------|-------|-----------|----------|----------|
   | новый      |   ·   |     ✓     |    ·     |    ✓     |
   | в ремонте  |   ·   |     ·     |    ✓     |    ✓     |
   | устранён   |   ·   |     ·     |    ·     |    ·     |
   | отклонён   |   ·   |     ·     |    ·     |    ·     |

   `устранён` and `отклонён` are terminal.

6. Filter the list (and the markers) by type and status. Delete removes the
   row and its marker together. The summary recalculates on every change.

## Project structure

```
src/
├── types/defect.ts          # Defect, DefectType, DefectStatus, SEVERITIES
├── data/
│   ├── defectCatalog.ts     # hardcoded type catalog (окраска/вмятина/зазор/скол)
│   ├── bodyZones.ts         # zone ids/vocabulary (single source of truth)
│   └── statusTheme.ts       # status → color
├── logic/                   # pure functions, no Vue: the unit-tested core
│   ├── fsm.ts               # transition map + canTransition
│   ├── validation.ts        # card validation (type + zone required)
│   └── summary.ts           # counts grouped by status
├── composables/useDefects.ts# THE store: one defects array + actions (no Pinia)
├── components/
│   ├── CarBodyMap.vue       # 3D car (Three.js): orbit, click-to-draft, markers
│   ├── DefectCard.vue       # create/edit form + validation + status buttons
│   ├── DefectList.vue       # list with type/status filters
│   └── SummaryPanel.vue     # VIN input + per-body counts
└── __tests__/               # Vitest specs (see npm test)
```

## Out of scope (by spec)

Backend/API, photo storage, auth/roles, PDF export, PDI checklist, computer
vision.
