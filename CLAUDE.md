# CLAUDE.md
# Off-the-Grid — Pilotage à distance

## Contexte
Prototype web pour piloter à distance l'EMS d'une installation off-grid
(automate WAGO 750-8217, CODESYS v3.5) via un tunnel OpenVPN sur 4G.
Client : François Beaufrère, site de Montchauvel (Chastel, 43300).
Prestataire : ANTRIS MANAGEMENT SRL. Réf. contrat ANTRIS-OFG-2026-001.

## Architecture retenue
- Shell web (ce repo) hébergé sur Netlify, mobile-first, thème sombre #070B14.
- Le bouton "Pilotage" fait une navigation de premier niveau vers la page
  WebVisu servie par l'automate en HTTP. On NE l'embarque PAS en iframe
  (blocage mixed content HTTPS -> HTTP).
- iOS : ce site ajouté à l'écran d'accueil. Deux icônes (OpenVPN Connect
  puis Off-the-Grid). Pas de code natif.
- Android : app Kotlin minimale = WebView sur ce même site. Étape ultérieure.

## Contraintes contractuelles à respecter
- Accès protégé par mot de passe (Délivrable B).
- ZÉRO valeur codée en dur : IP de l'automate, nom du site, logo et liste
  des paramètres vivent dans un unique fichier config.js. La solution doit
  être duplicable à une autre installation sans toucher au code (Délivrable C).
- Cohérence visuelle avec la page WebVisu CODESYS (mêmes couleurs) pour que
  la transition soit continue.
- Aucune dépendance sous licence GPL ou incompatible avec une exploitation
  commerciale libre (article 5.3 du contrat).

## Conventions
- Français dans l'UI et les commentaires.
- Pas de framework lourd : HTML/CSS/JS.


## Repository overview

This repo is the working folder for **Off-the-Grid**, a remote-monitoring/control app for an
off-grid solar energy installation (Montchauvel site, owned by "François"). The install is
built around a **WAGO 750-8217** PLC running **CODESYS V3.5**, reachable only through an
**OpenVPN** tunnel over a 4G modem (Quectel EC25 / Orange SIM).

Most of the repository is **not code**: CODESYS project files (`Version_epuree_code/`,
`Off-the-grid-travail/`, `.project`/`.opt`/`.compileinfo` files), commercial proposals, and
admin documents (`Administratif/`, `Propositions commerciales/`). There is also a
`graphify-out/` cache directory (generated knowledge-graph output — do not hand-edit it).

There are **two separate, unrelated JS/TS codebases** in this repo. Know which one a task
targets before touching files — they are not two versions of the same app:

1. **`MVP-visualisation/`** — a polished, standalone React demo (the current focus of active
   development, per recent commits). Entirely client-side with a mocked data layer; no backend.
2. **`Code/Mock/offgrid/`** — an earlier, more primitive spike of the *real* target
   architecture: a vanilla-JS PWA talking to a Node/Express gateway that itself speaks OPC-UA
   to the PLC (or to a mock PLC server for local dev).

## `MVP-visualisation/` — React demo app

Commands (run from `MVP-visualisation/`):

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # vite build -> dist/ (NOTE: no tsc step is wired in — this does not
                   # type-check the project despite the README wording; esbuild only
                   # transpiles and will not fail on type errors)
npm run preview   # serve the production build locally
```

No lint script and no test runner are configured for this project.

Deployment: `.github/workflows/deploy.yml` builds and publishes `dist/` to GitHub Pages on
every push to `main`. `vite.config.ts` uses `base: './'` so the build works under any repo name.

### Architecture

The app is built around one extension seam: everything the UI needs comes through the
`PlcDataSource` interface (`src/services/plc/PlcDataSource.ts`), currently implemented only by
`MockPlcDataSource`. Swapping in a real data source (WebVisu, Modbus TCP, or an SD-card file
CODESYS re-reads) means writing one new implementation and substituting it in
`src/context/AppContext.tsx` — the connect screen and dashboard components do not change.

```
src/
├── types/telemetry.ts          shared types (Snapshot, MeasurementPoint, ConnectionState...)
├── services/
│   ├── config.ts                VPN/PLC endpoint metadata, polling interval, `simulated` flag
│   ├── connection/               ConnectionService interface + MockConnectionService
│   └── plc/                      PlcDataSource interface + MockPlcDataSource (~46 points,
│                                  physically-plausible simulated dynamics: day/night solar
│                                  curve, battery SOC integration, morning/evening load peaks)
├── context/AppContext.tsx        instantiates the services once, wires them into React
├── hooks/useTelemetry.ts         subscribes a component to live Snapshot updates
├── data/measurementPoints.ts     catalog of the 46 measurement points, each tagged with the
│                                  exact CODESYS variable name it will map to in production
└── components/
    ├── connect/                  connection screen + simulated OpenVPN handshake steps
    └── dashboard/                 battery gauge, energy flow, live chart, parameter controls
```

`CONFIG.simulated` in `services/config.ts` is the flag to flip when a real `PlcDataSource`
lands. Measurement point IDs and labels are written to match real CODESYS variable names
(see `types/telemetry.ts` comments) so the mock UI is a direct target for the real WebVisu.

## `Code/Mock/offgrid/` — gateway + OPC-UA spike

Three components under this folder, forming the real (non-demo) target architecture:

```
PWA (app/, static JS/HTML)  --HTTP/REST-->  Gateway (gateway/, Express)  --OPC-UA-->  WAGO
```

- `gateway/server.js` — Express server that also serves the PWA (`app/`) statically, so there's
  no CORS to deal with. Connects to the PLC as an OPC-UA client. `gateway/parameters.json` is
  the single source of truth for every exposed variable (nodeId, min/max, kind, dataType) —
  adding a controllable parameter means adding an entry here *and* checking the matching box in
  the WAGO's CODESYS Symbol Configuration (see `Code/Mock/Instructions_Symbol_Configuration.md`).
  Min/max guardrails are enforced twice: once in the UI, once server-side in `validate()`.
- `mock-wago/server.js` — a standalone OPC-UA *server* that fakes the WAGO's exposed variables
  (same nodeIds as `parameters.json`) with simple simulated dynamics, for developing against
  without VPN/PLC access.
- `app/` — static PWA (plain HTML/CSS/JS, no build step) served by the gateway.

Run locally (two terminals, from `Code/Mock/offgrid/`):

```bash
cd mock-wago && npm install && node server.js     # fake WAGO on opc.tcp://localhost:4840/UA/OffGrid
cd gateway && npm install && node server.js       # gateway + PWA on http://localhost:3000
```

To point the gateway at the real PLC instead of the mock, connect to the OpenVPN tunnel and set
`OPCUA_ENDPOINT` in `gateway/.env` (copy from `.env.example`) to the WAGO's VPN IP. OPC-UA
currently allows anonymous auth (acceptable only because the VPN already encrypts the link);
`OPCUA_USER`/`OPCUA_PASSWORD`/`OPCUA_SECURE` are there for when a dedicated account is set up.
No test runner is configured in either `gateway/` or `mock-wago/`.

## Conventions to preserve

- Code comments and commit-adjacent docs are written in French; match that when editing files
  in either codebase.
- Domain terms recur verbatim across both codebases and should stay consistent: WAGO
  750-8217, CODESYS V3.5, OPC-UA, Symbol Configuration, Hot Write (writing a variable live
  without recompiling CODESYS), SOC (state of charge), ECS (eau chaude sanitaire).
