# QC Defect Logger · MyCar Pro Smart Factory

App for factory quality control (ОТК). An inspector rotates a 3D car model,
clicks a spot on the body, fills in a defect card, and manages the defect list
through a status lifecycle. Defects are stored **on a local API server with a
JSON file storage**, so data survives page refreshes and server restarts and is
available to other people (мастер, следующая смена). A PDI (Pre-Delivery
Inspection) report can be exported per VIN as a printable HTML page or CSV.

Stack: Vue 3 + TypeScript (Composition API, `<script setup>`), Vite, Vitest,
Three.js for the 3D body view; Node + Express for the API. No Pinia, no
router, no UI libraries, no database (JSON file storage).

## Install and run

```bash
npm install        # one time
npm run seed       # optional: demo data (1 body with defects in mixed statuses)
npm run server     # API server → http://localhost:3001 (terminal 1)
npm run dev        # frontend  → http://localhost:5173 (terminal 2)
npm test           # unit tests (frontend logic + API), single run
npm run test:watch # unit tests, watch mode
npm run build      # type-check (vue-tsc) + production build into dist/
```

Requires Node.js 18+ (LTS recommended). The server stores data in
`server/data.json` (created automatically; a missing or corrupt file never
crashes the server — it just starts empty). Set `PORT` / `DATA_FILE` env vars
to override, and `VITE_API_URL` on the frontend if the API is not on
`http://localhost:3001`.

## API endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET    | `/defects?vin=XXX` | list defects (all, or one body's) |
| POST   | `/defects` | create defect (id + status assigned by server) |
| PATCH  | `/defects/{id}` | update fields and/or status (FSM enforced) |
| DELETE | `/defects/{id}` | delete defect (404 if unknown) |
| GET    | `/defect-types` | defect type catalog |
| POST   | `/defect-types` | add a catalog type |
| GET    | `/inspections/{vin}/pdi-report` | PDI report, `?format=html` (default) or `csv` |

Validation lives on **both** sides: the frontend validates for convenience, the
server validates so the rules cannot be bypassed (required `typeId`/`zone`,
known type, legal FSM transition). CORS is enabled for the local frontend.

### curl examples

```bash
# create a defect (server returns id and status "новый")
curl -X POST http://localhost:3001/defects \
  -H "Content-Type: application/json" \
  -d '{"vin":"X1","zone":"капот","x":120,"y":80,"typeId":"paint","severity":"значительный","comment":"скол"}'
# → 201 {"id":"d_1","status":"новый",...}

# validation error: no typeId → 400, nothing is created
curl -X POST http://localhost:3001/defects \
  -H "Content-Type: application/json" -d '{"vin":"X1","zone":"капот"}'
# → 400 {"error":"Ошибка валидации","errors":{"typeId":"Выберите тип дефекта"}}

# list one body's defects
curl "http://localhost:3001/defects?vin=X1"

# legal status transition (новый → в ремонте)
curl -X PATCH http://localhost:3001/defects/d_1 \
  -H "Content-Type: application/json" -d '{"status":"в ремонте"}'

# illegal transition (устранён → новый) → 400 with an explanation
curl -X PATCH http://localhost:3001/defects/d_1 \
  -H "Content-Type: application/json" -d '{"status":"новый"}'

# delete; unknown id → 404, server stays up
curl -X DELETE http://localhost:3001/defects/d_1
curl -X DELETE http://localhost:3001/defects/d_999   # → 404

# PDI report: printable HTML page or CSV for Excel
open "http://localhost:3001/inspections/X1/pdi-report"
curl -O "http://localhost:3001/inspections/X1/pdi-report?format=csv"
```

### PDI report

Columns: `N; zone; type; severity; status; comment; date`, then a summary line
`годен=да/нет; всего; устранено; отклонено; открыто`. The body is **годен к
выдаче** iff it has no defects in «новый» or «в ремонте». A VIN with zero
defects is годен=да; an unknown VIN returns a clear 404 (never a silent empty
file).

## How to use

1. Set the body VIN in the summary bar (defects are scoped per body).
2. Drag to rotate the car (wheel = zoom). Click a spot on the body: a red
   draft marker appears there and the card opens with the zone prefilled.
3. Pick a defect type and zone (both required; save is blocked with visible
   messages otherwise), optionally severity and comment. Save — the defect is
   created on the server.
4. The marker becomes a colored dot (color = status) and a row appears in the
   list. Click any marker or row to open its card.
5. Change status with the transition buttons. Only legal moves are shown:

   | from \ to  | новый | в ремонте | устранён | отклонён |
   |------------|-------|-----------|----------|----------|
   | новый      |   ·   |     ✓     |    ·     |    ✓     |
   | в ремонте  |   ·   |     ·     |    ✓     |    ✓     |
   | устранён   |   ·   |     ·     |    ·     |    ·     |
   | отклонён   |   ·   |     ·     |    ·     |    ·     |

   `устранён` and `отклонён` are terminal (enforced on the server too).

6. Filter the list (and the markers) by type and status. Delete removes the
   row and its marker together. The summary recalculates on every change.
7. «Отчёт PDI» opens the printable report for the current VIN; «CSV» downloads
   the spreadsheet version.
8. If the API is unreachable, a banner with a retry button appears in the app.

## Project structure

```
server/                       # local API (Node + Express, ESM, no build step)
├── index.js                  # entry: port 3001, storage at server/data.json
├── app.js                    # endpoints + server-side validation
├── fsm.js                    # server copy of statuses and FSM transitions
├── storage.js                # JSON file storage: load on start, save on change
├── pdi.js                    # PDI report: verdict rule, CSV and HTML renderers
├── seed.js                   # demo data (npm run seed)
└── __tests__/api.spec.js     # API tests (supertest)
src/
├── types/defect.ts           # Defect, DefectType, DefectStatus, SEVERITIES
├── api/client.ts             # HTTP client for the API + PDI report URLs
├── data/
│   ├── defectCatalog.ts      # fallback type catalog (server is the source)
│   ├── bodyZones.ts          # zone ids/vocabulary (single source of truth)
│   └── statusTheme.ts        # status → color
├── logic/                    # pure functions, no Vue: the unit-tested core
│   ├── fsm.ts                # transition map + canTransition
│   ├── validation.ts         # card validation (type + zone required)
│   └── summary.ts            # counts grouped by status
├── composables/useDefects.ts # THE store: API-backed defects cache + actions
├── components/
│   ├── CarBodyMap.vue        # 3D car (Three.js): orbit, click-to-draft, markers
│   ├── DefectCard.vue        # create/edit form + validation + status buttons
│   ├── DefectList.vue        # list with type/status filters
│   └── SummaryPanel.vue      # VIN input + PDI export + per-body counts
└── __tests__/                # Vitest specs (see npm test)
```

## Out of scope (by spec)

Photo storage, auth/roles, PDF export (PDI is CSV/HTML), computer vision,
SQLite (JSON file storage chosen per spec recommendation).
