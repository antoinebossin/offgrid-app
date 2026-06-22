/*
 * Gateway Off-the-Grid  —  pont OPC-UA  <->  HTTP/REST
 * ------------------------------------------------------------------
 * Cote PLC  : client OPC-UA connecte au WAGO (ou au simulateur).
 * Cote appli: API REST + sert la PWA (meme origine, pas de souci CORS).
 *
 * Ce composant est le "moteur" (back-end) de la mission. Il doit tourner
 * a l'interieur du reseau de Francois (accessible par le tunnel OpenVPN) :
 * en dev sur le PC d'Antoine connecte au VPN, en prod sur un petit boitier
 * dedie du LAN. Il ne touche jamais au systeme de fichiers ni au code
 * CODESYS : il ne voit QUE les variables explicitement exposees.
 *
 * Config via variables d'environnement (voir .env.example).
 */
const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const {
  OPCUAClient, AttributeIds, Variant, DataType,
  MessageSecurityMode, SecurityPolicy, UserTokenType,
} = require("node-opcua");

const PORT = process.env.PORT || 3000;
const ENDPOINT = process.env.OPCUA_ENDPOINT || "opc.tcp://localhost:4840/UA/OffGrid";
const OPCUA_USER = process.env.OPCUA_USER || null;
const OPCUA_PASSWORD = process.env.OPCUA_PASSWORD || null;
const SECURE = process.env.OPCUA_SECURE === "true"; // active Sign&Encrypt quand le WAGO l'exigera

const schema = JSON.parse(fs.readFileSync(path.join(__dirname, "parameters.json"), "utf8"));
const allParams = [...schema.writable, ...schema.readonly];
const byId = Object.fromEntries(allParams.map((p) => [p.id, p]));

// ---------------------------------------------------------------- OPC-UA
let session = null;
let connected = false;

const client = OPCUAClient.create({
  applicationName: "OffGridGateway",
  endpointMustExist: false,
  securityMode: SECURE ? MessageSecurityMode.SignAndEncrypt : MessageSecurityMode.None,
  securityPolicy: SECURE ? SecurityPolicy.Basic256Sha256 : SecurityPolicy.None,
  connectionStrategy: { maxRetry: -1, initialDelay: 1000, maxDelay: 10000 },
});

client.on("backoff", (n, delay) =>
  console.log(`[OPC-UA] reconnexion... tentative ${n} dans ${delay} ms`));
client.on("connection_lost", () => { connected = false; console.log("[OPC-UA] connexion perdue"); });
client.on("connection_reestablished", () => console.log("[OPC-UA] connexion retablie"));

async function connect() {
  await client.connect(ENDPOINT);
  const identity = OPCUA_USER
    ? { type: UserTokenType.UserName, userName: OPCUA_USER, password: OPCUA_PASSWORD }
    : { type: UserTokenType.Anonymous };
  session = await client.createSession(identity);
  connected = true;
  console.log(`[OPC-UA] session ouverte sur ${ENDPOINT}` +
    (OPCUA_USER ? ` (utilisateur ${OPCUA_USER})` : " (anonyme)"));
}

async function readParam(p) {
  const dv = await session.read({ nodeId: p.nodeId, attributeId: AttributeIds.Value });
  return dv.value ? dv.value.value : null;
}

function coerce(p, raw) {
  switch (p.dataType) {
    case "Boolean": return { dataType: DataType.Boolean, value: Boolean(raw) };
    case "Int16":   return { dataType: DataType.Int16, value: Math.round(Number(raw)) };
    case "Int32":   return { dataType: DataType.Int32, value: Math.round(Number(raw)) };
    default:        return { dataType: DataType.Double, value: Number(raw) };
  }
}

// Garde-fous : meme logique que l'interface, rejouee cote serveur (defense en profondeur)
function validate(p, value) {
  if (p.kind === "number") {
    const v = Number(value);
    if (Number.isNaN(v)) return "Valeur non num\u00e9rique.";
    if (v < p.min || v > p.max) return `Hors plage autoris\u00e9e (${p.min}\u2013${p.max} ${p.unit}).`;
  } else if (p.kind === "enum") {
    if (!p.options.some((o) => o.value === Number(value))) return "Mode inconnu.";
  } else if (p.kind === "boolean") {
    if (typeof value !== "boolean") return "Attendu : vrai/faux.";
  }
  return null;
}

// ------------------------------------------------------------------- API
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "..", "app"))); // sert la PWA

app.get("/api/health", (_req, res) =>
  res.json({ connected, endpoint: ENDPOINT, secure: SECURE }));

// Etat complet : valeurs courantes + metadonnees pour le rendu
app.get("/api/state", async (_req, res) => {
  if (!connected || !session) return res.status(503).json({ error: "PLC non connect\u00e9" });
  try {
    const writable = [];
    for (const p of schema.writable) writable.push({ ...p, value: await readParam(p) });
    const readonly = [];
    for (const p of schema.readonly) readonly.push({ ...p, value: await readParam(p) });
    res.json({ writable, readonly, ts: Date.now() });
  } catch (e) {
    res.status(502).json({ error: "Lecture OPC-UA impossible", detail: String(e.message || e) });
  }
});

// Hot Write : ecriture d'un parametre, sans recompilation cote CODESYS
app.put("/api/parameters/:id", async (req, res) => {
  const p = byId[req.params.id];
  if (!p) return res.status(404).json({ error: "Param\u00e8tre inconnu" });
  if (!schema.writable.find((w) => w.id === p.id))
    return res.status(403).json({ error: "Param\u00e8tre en lecture seule" });
  if (!connected || !session) return res.status(503).json({ error: "PLC non connect\u00e9" });

  const reason = validate(p, req.body.value);
  if (reason) return res.status(400).json({ error: reason });

  try {
    const statusCode = await session.write({
      nodeId: p.nodeId,
      attributeId: AttributeIds.Value,
      value: { value: new Variant(coerce(p, req.body.value)) },
    });
    if (statusCode.isGood()) {
      const value = await readParam(p); // relit pour confirmer la prise en compte
      return res.json({ id: p.id, value, written: true });
    }
    res.status(502).json({ error: `Refus\u00e9 par le PLC : ${statusCode.toString()}` });
  } catch (e) {
    res.status(502).json({ error: "\u00c9criture OPC-UA impossible", detail: String(e.message || e) });
  }
});

(async () => {
  try { await connect(); } catch (e) { console.error("[OPC-UA] connexion initiale KO :", e.message); }
  app.listen(PORT, () => {
    console.log(`Gateway pret : http://localhost:${PORT}`);
    console.log(`PWA servie sur http://localhost:${PORT}/  | API sur /api`);
  });
})();
