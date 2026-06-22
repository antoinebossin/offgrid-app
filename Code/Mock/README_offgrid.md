# Off-the-Grid — Pilotage distant de l'EMS

Application de modification à distance des paramètres de l'EMS (automate WAGO 750-8217,
CODESYS v3.5) **sans recompilation**, via OPC-UA sur le tunnel OpenVPN existant.

## Architecture (3 couches)

```
   [ Smartphone ]                 [ Réseau de François ]
   ┌──────────────┐   OpenVPN    ┌───────────────────────────────┐
   │  PWA (app/)  │═════════════▶│  Gateway (gateway/)           │
   │  HTTP/REST   │   (tunnel)   │  OPC-UA client ──▶ WAGO :4840  │
   └──────────────┘              │                   (CODESYS)   │
                                 └───────────────────────────────┘
```

1. **OpenVPN** — tunnel existant, natif sur le WAGO. La PWA ne fonctionne que tunnel actif.
2. **Gateway** (`gateway/`) — pont OPC-UA ↔ REST. Tourne *à l'intérieur* du réseau de François.
   Ne voit **que** les variables explicitement exposées par la Symbol Configuration : aucun
   accès au système de fichiers ni au code CODESYS.
3. **PWA** (`app/`) — interface mobile servie par le gateway (même origine, pas de CORS).

Une seule variable à ajouter/modifier ? On édite `gateway/parameters.json` et on coche la
variable dans la Symbol Configuration côté WAGO. Aucun code à toucher.

## Lancer en développement (sans le WAGO)

Le dossier `mock-wago/` simule l'automate et ses variables.

```bash
# Terminal 1 — simulateur WAGO
cd mock-wago && npm install && node server.js

# Terminal 2 — gateway + PWA
cd gateway && npm install && node server.js
```

Puis ouvrir **http://localhost:3000**. On peut lire les mesures, bouger les curseurs et
appliquer : le simulateur logue chaque Hot Write reçu.

## Brancher le vrai WAGO

Connecter le PC au VPN, puis dans `gateway/.env` :

```
OPCUA_ENDPOINT=opc.tcp://<IP_du_WAGO_sur_le_VPN>:4840
```

(prérequis : Symbol Configuration en place côté WAGO — voir le doc d'instructions).

## Déploiement cible

Le gateway doit tourner en permanence sur un point accessible par le VPN :
- **Dev** : PC d'Antoine connecté au VPN.
- **Prod** : petit boîtier dédié sur le LAN de François (type Raspberry Pi / mini-PC),
  ou conteneur sur le WAGO. À trancher avec François selon ses contraintes.

Côté usage : l'utilisateur ouvre OpenVPN, puis l'appli (les « deux boutons » iOS évoqués
par François). La PWA s'installe sur l'écran d'accueil (Ajouter à l'écran d'accueil).

## Sécurité

- Aujourd'hui l'OPC-UA accepte l'anonyme : c'est pour ça qu'aucun mot de passe n'a été
  demandé. C'est acceptable **derrière le VPN** (qui chiffre déjà tout), et ça évite
  surtout d'avoir le moindre accès admin/fichiers de l'automate.
- Pour la priorité « sécurité » de François : activer un **compte OPC-UA dédié** côté WAGO
  puis renseigner `OPCUA_USER` / `OPCUA_PASSWORD`, et passer `OPCUA_SECURE=true` quand le
  serveur exigera Sign & Encrypt (Basic256Sha256).
- Garde-fous : les bornes min/max de `parameters.json` sont appliquées **deux fois** —
  dans l'interface (curseur borné) et dans le gateway (rejet serveur).

## Statut

- [x] Lecture des variables (OPC-UA)
- [x] Hot Write (écriture live, sans recompilation) — validé sur simulateur
- [x] Garde-fous (rejet hors plage)
- [x] Interface mobile (lecture + curseurs + modes + ON/OFF)
- [ ] Branchement WAGO réel (attend la Symbol Configuration de François)
- [ ] Authentification OPC-UA (compte dédié)
- [ ] Tests de robustesse (coupure 4G en cours d'écriture) + documentation finale
