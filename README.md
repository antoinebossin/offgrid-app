# Off-the-Grid — application de pilotage à distance

Maquette fonctionnelle de l'application de **pilotage à distance** de l'installation
énergétique autonome de Montchauvel (projet *Off-the-Grid* de François).

Le but de cette première version : montrer **à quoi ressemblerait l'application**.
On reproduit, sous forme d'un site web façon app mobile, le parcours réel :

> **Bouton de connexion → établissement du tunnel OpenVPN → tableau de bord temps réel + pilotage des paramètres.**

L'installation cible : automate **WAGO 750-8217**, runtime **CODESYS V3.5**, modem
**Quectel EC25** + SIM data Orange, joignable par **tunnel OpenVPN** sur la 4G.

---

## 🔌 Démo en ligne

Une fois le dépôt poussé sur GitHub avec Pages activé (voir plus bas), la démo est
accessible sur :

```
https://<ton-utilisateur>.github.io/offgrid-app/
```

> ⚠️ **Note honnête.** Dans la démo web, le tunnel VPN est **simulé** : un navigateur
> ne peut pas lancer un VPN système. Tout le reste (architecture, dashboard, couche
> données, écriture de paramètres) est du vrai code. Dans la future app mobile, le
> bouton déclenchera le client OpenVPN puis chargera le tableau de bord.

---

## 🚀 Lancer en local

Prérequis : Node.js 18+.

```bash
npm install
npm run dev      # http://localhost:5173
```

Autres commandes :

```bash
npm run build    # vérifie les types + build de production dans dist/
npm run preview  # sert le build de production en local
```

---

## 🧱 Architecture

L'idée directrice : **séparer l'interface de la source de données** pour pouvoir
brancher l'automate réel plus tard sans rien casser.

```
src/
├── types/telemetry.ts          # types partagés (mesures, paramètres, connexion)
├── services/
│   ├── config.ts               # endpoints VPN / automate, intervalles
│   ├── connection/             # établissement du tunnel (interface + simulation)
│   │   ├── ConnectionService.ts        ← interface
│   │   └── MockConnectionService.ts    ← séquence OpenVPN simulée
│   └── plc/                    # données de l'automate
│       ├── PlcDataSource.ts            ← interface (LE point d'extension)
│       └── MockPlcDataSource.ts        ← jumeau simulé (~46 points + dynamique)
├── context/AppContext.tsx      # état de connexion + instance des services
├── hooks/useTelemetry.ts       # abonnement temps réel à la source de données
├── data/measurementPoints.ts   # catalogue des 46 points de mesure
└── components/
    ├── connect/                # écran de connexion + séquence du tunnel
    └── dashboard/              # jauge batterie, flux d'énergie, graphe, pilotage…
```

### Le point d'extension : `PlcDataSource`

Toute la donnée transite par **une seule interface** :

```ts
interface PlcDataSource {
  start(): void
  stop(): void
  subscribe(cb: (s: Snapshot) => void): () => void
  getHistory(): HistoryPoint[]
  getValue(id: string): number
  writeParameter(id: string, value: number): Promise<void>
}
```

Pour brancher l'installation réelle, il suffit d'écrire **une** nouvelle implémentation
et de la substituer à `MockPlcDataSource` dans `AppContext.tsx`. Trois pistes selon
ce que l'automate expose une fois le tunnel ouvert :

| Piste | Principe | Remarque |
|-------|----------|----------|
| **WebVisu CODESYS** | lire/écrire les variables via l'interface de visualisation servie par l'automate (la piste de François) | rapide, déjà dans CODESYS |
| **Modbus TCP** | mapper les variables sur des registres Modbus | nécessite une petite passerelle (le navigateur ne fait pas de Modbus) |
| **Fichier carte SD** | lire/écrire un fichier de variables que CODESYS relit (SFTP/FTP) | l'approche « zéro-recompilation » du cahier des charges initial |

L'écran et le dashboard, eux, **ne changent pas**.

---

## 📊 Données affichées

**46 points de mesure** simulés avec une dynamique physique réaliste (cycle jour/nuit,
production solaire en cloche, intégration de l'état de charge batterie, pics de
consommation matin/soir, îlotage…), regroupés par familles : Photovoltaïque, Solaire
thermique, Fourneau bouilleur, Batterie, Onduleur, Consommation maison, Réseau,
Environnement.

**Paramètres pilotables à distance** (avec garde-fous, conformément à l'étape UX/UI du
cahier des charges) :

- **Mode EMS** : Auto / Éco / Confort / Secours
- **Consigne eau chaude** : 40–65 °C *(garde-fou : impossible de dépasser 65 °C)*
- **Réserve batterie minimale** : 10–50 %
- **Priorité de charge** : Batterie / Eau chaude / Équilibré
- **Délestage automatique** : on/off
- **Appoint électrique** : on/off

---

## ☁️ Déploiement GitHub Pages

Le workflow `.github/workflows/deploy.yml` build et publie automatiquement à chaque
push sur `main`.

1. Pousser le dépôt sur GitHub (voir ci-dessous).
2. Dans **Settings → Pages → Build and deployment**, choisir **GitHub Actions** comme source.
3. Le prochain push (ou un lancement manuel du workflow) publie la démo.

Le `base: './'` de `vite.config.ts` rend le build indépendant du nom du dépôt.

---

## 📦 Pousser sur GitHub

Le dépôt est déjà initialisé avec un premier commit. Pour le publier :

```bash
# créer un dépôt vide "offgrid-app" sur github.com, puis :
git remote add origin https://github.com/<ton-utilisateur>/offgrid-app.git
git branch -M main
git push -u origin main
```

(ou avec GitHub CLI : `gh repo create offgrid-app --public --source=. --push`)

---

## 🗺️ Suite

- Brancher une `PlcDataSource` réelle (WebVisu / Modbus / fichier).
- Empaqueter en app mobile (Capacitor ou React Native) et déclencher le client OpenVPN
  depuis le bouton de connexion.
- Affiner les garde-fous et les profils de paramètres par client (volet « solution
  clés en main » de la proposition commerciale).

## 🛠️ Stack

React 18 · Vite · TypeScript · Recharts · lucide-react. Aucune dépendance backend.

## Licence

MIT © 2026 Antoine Bossin
