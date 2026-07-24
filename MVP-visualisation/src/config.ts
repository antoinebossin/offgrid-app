// ---------------------------------------------------------------------------
// SOURCE UNIQUE DE VERITE de l'app. Pour dupliquer la solution sur une autre
// installation : ne modifier QUE ce fichier (identite du site, connexion,
// catalogue de paramètres). Aucune autre valeur d'installation ne doit être
// codée en dur ailleurs dans src/.
//
// En demo, le tunnel OpenVPN est SIMULE. En production, ces valeurs decrivent
// l'installation reelle ciblee.
// ---------------------------------------------------------------------------

import type { MeasurementPoint, MetricGroup } from './types/telemetry'

/** Identite du site (nom, logo, localisation) — a changer pour dupliquer l'app. */
export interface SiteIdentity {
  /** Nom affiche dans le header / l'ecran de connexion. */
  name: string
  /** Sous-titre sous le nom (ex: localisation + fonction). */
  tagline: string
  /** Localisation courte (utilisee dans les textes). */
  location: string
  /**
   * Chemin vers un logo (place le fichier dans public/ et reference-le ici,
   * ex: '/logo-client.svg'). Laisser `null` pour utiliser l'icone par defaut.
   */
  logoSrc: string | null
}

export const CONFIG = {
  site: {
    name: 'Off-the-Grid',
    tagline: 'Montchauvel · Pilotage à distance',
    location: 'Montchauvel',
    logoSrc: null,
  } satisfies SiteIdentity,

  // Profil / endpoint OpenVPN (la "URL fixe" evoquee par Francois).
  vpn: {
    profile: 'offgrid-montchauvel.ovpn',
    endpoint: 'vpn.offgrid.local:1194',
    protocol: 'UDP',
    cipher: 'AES-256-GCM',
  },

  // Automate cible.
  plc: {
    model: 'WAGO 750-8217',
    runtime: 'CODESYS V3.5 SP19',
    modem: 'Quectel EC25 · SIM data Orange',
    // URL fixe de l'interface (WebVisu Codesys ou passerelle) une fois le tunnel ouvert.
    dataUrl: 'http://10.8.0.1:8080/webvisu',
  },

  pollingIntervalMs: 1000,
  historyLength: 90,
  // Drapeau global : passe a false quand on branche un vrai PlcDataSource.
  simulated: true,
}

// ---------------------------------------------------------------------------
// Catalogue des paramètres — mêmes noms EXACTS que les variables Codesys.
// ---------------------------------------------------------------------------

// Metadonnees par groupe (libelle + couleur d'accent, coherentes avec la DA).
export const GROUP_META: Record<MetricGroup, { label: string; color: string }> = {
  battery: { label: 'Batterie domestique', color: '#34D399' },
  ballon: { label: 'Ballons', color: '#FB923C' },
  boiler: { label: 'Fourneau bouilleur', color: '#EF4444' },
  valves: { label: 'Vannes', color: '#38BDF8' },
  ambient: { label: 'Ambiances', color: '#2DD4BF' },
  pv: { label: 'Photovoltaïque', color: '#F59E0B' },
  flows: { label: 'Flux énergétiques', color: '#A78BFA' },
  ems: { label: 'Pilotage', color: '#60A5FA' },
}

// --- Seuils d'alarme ballon (G_Parameters, valeurs Codesys reelles) --------
export const SEUILS = {
  ballon_H: 75, // Alarme_Ballon_Seuil_Temp_H
  ballon_B1: 55, // Alarme_Ballon_Seuil1_Temp_B
  ballon_B2: 65, // Alarme_Ballon_Seuil2_Temp_B
}

/**
 * Les 5 ampoules du panneau d'etat — exactement les 5 groupes d'alarmes
 * calcules par le programme `Alarmes` de Codesys. Chaque ampoule a 3 LED
 * independantes (vert / jaune / rouge) pilotees par 3 variables booleennes.
 */
export interface AlarmLampDef {
  key: string
  label: string
  /** Variable numerique illustree par l'ampoule + unite. */
  valueId?: string
  unit?: string
  decimals?: number
  /** Sous-titre : rappel des seuils. */
  thresholds: string
  /** ids des 3 LED (vert, jaune, rouge). */
  green: string
  amber: string
  red: string
}

export const ALARM_LAMPS: AlarmLampDef[] = [
  {
    key: 'soc',
    label: 'Batterie · SOC',
    valueId: 'gBatterie_SOC',
    unit: '%',
    thresholds: 'Rouge < 35 · Jaune < 55 · Vert ≥ 55  (seuils à confirmer)',
    green: 'Batterie_SOC_AlarmV',
    amber: 'Batterie_SOC_AlarmJ',
    red: 'Batterie_SOC_AlarmR',
  },
  {
    key: 'battTemp',
    label: 'Batterie · température',
    valueId: 'gBatterie_Temperature',
    unit: '°C',
    decimals: 1,
    thresholds: 'Vert 10–20 · Jaune 5–25 · Rouge hors 5–25  (à confirmer)',
    green: 'Temp_Batterie_AlarmV',
    amber: 'Temp_Batterie_AlarmJ',
    red: 'Temp_Batterie_AlarmR',
  },
  {
    key: 'ballonG',
    label: 'Ballon gauche',
    valueId: 'gBallonHautG',
    unit: '°C',
    decimals: 1,
    thresholds: `Jaune si bas > ${SEUILS.ballon_B1} · Rouge si haut > ${SEUILS.ballon_H} & bas > ${SEUILS.ballon_B2}`,
    green: 'BallonG_AlarmV',
    amber: 'BallonG_AlarmJ',
    red: 'BallonG_AlarmR',
  },
  {
    key: 'ballonD',
    label: 'Ballon droit',
    valueId: 'gBallonHautD',
    unit: '°C',
    decimals: 1,
    thresholds: `Jaune si bas > ${SEUILS.ballon_B1} · Rouge si haut > ${SEUILS.ballon_H} & bas > ${SEUILS.ballon_B2}`,
    green: 'BallonD_AlarmV',
    amber: 'BallonD_AlarmJ',
    red: 'BallonD_AlarmR',
  },
  {
    key: 'boiler',
    label: 'Fourneau bouilleur',
    valueId: 'rValue_RTemp_2',
    unit: '°C',
    decimals: 1,
    thresholds: 'Jaune entrée > 40 · Rouge entrée > 50 / chauffe rapide',
    green: 'Bouilleur_AlarmV',
    amber: 'Bouilleur_AlarmJ',
    red: 'Bouilleur_AlarmR',
  },
]

// --- Vannes (3 vannes, chacune ouverte/fermee) ------------------------------
export const VALVES = [
  { key: 'HD', label: 'Vanne haute droite', open: 'VanneHD_Ouverte', close: 'VanneHD_Fermee' },
  { key: 'HG', label: 'Vanne haute gauche', open: 'VanneHG_Ouverte', close: 'VanneHG_Fermee' },
  { key: 'M', label: 'Vanne milieu', open: 'VanneM_Ouverte', close: 'VanneM_Fermee' },
]

// ---------------------------------------------------------------------------
// Catalogue des points de mesure, avec le nom EXACT de la variable Codesys.
// ---------------------------------------------------------------------------
export const MEASUREMENT_POINTS: MeasurementPoint[] = [
  // --- Batterie domestique
  { id: 'gBatterie_SOC', label: 'État de charge', unit: '%', group: 'battery', codesys: 'G_Sensors.gBatterie_SOC', decimals: 0 },
  { id: 'gBatterie_Temperature', label: 'Température', unit: '°C', group: 'battery', codesys: 'G_Sensors.gBatterie_Temperature', decimals: 1 },
  { id: 'gBatterie_Puissance', label: 'Puissance', unit: 'W', group: 'battery', codesys: 'G_Sensors.gBatterie_Puissance' },

  // --- Ballons (haut / bas · droite / gauche)
  { id: 'gBallonHautD', label: 'Ballon droit · haut', unit: '°C', group: 'ballon', codesys: 'G_Sensors.gBallonHautD', decimals: 1 },
  { id: 'gBallonBasD', label: 'Ballon droit · bas', unit: '°C', group: 'ballon', codesys: 'G_Sensors.gBallonBasD', decimals: 1 },
  { id: 'gBallonHautG', label: 'Ballon gauche · haut', unit: '°C', group: 'ballon', codesys: 'G_Sensors.gBallonHautG', decimals: 1 },
  { id: 'gBallonBasG', label: 'Ballon gauche · bas', unit: '°C', group: 'ballon', codesys: 'G_Sensors.gBallonBasG', decimals: 1 },

  // --- Fourneau bouilleur
  { id: 'rValue_RTemp_2', label: 'Temp. entrée fourneau', unit: '°C', group: 'boiler', codesys: 'PLC_MultiTel.rValue_RTemp_2', decimals: 1 },
  { id: 'gBoiler_Power', label: 'Flux thermique bouilleur', unit: 'W', group: 'boiler', codesys: 'G_Computed.gBoiler_Power' },
  { id: 'xBouilleur', label: 'Fourneau en marche', unit: '', group: 'boiler', codesys: 'Bouilleur.xBouilleur', enumLabels: ['Arrêt', 'Marche'] },
  { id: 'ChauffeRapide', label: 'Chauffe rapide', unit: '', group: 'boiler', codesys: 'Historique.ChauffeRapide', enumLabels: ['Non', 'Oui'] },

  // --- Ambiances
  { id: 'gExterieur', label: 'Température extérieure', unit: '°C', group: 'ambient', codesys: 'G_Sensors.gExterieur', decimals: 1 },
  { id: 'gSalon', label: 'Température salon', unit: '°C', group: 'ambient', codesys: 'G_Sensors.gSalon', decimals: 1 },

  // --- Photovoltaique
  { id: 'gPV_Power', label: 'Production PV', unit: 'W', group: 'pv', codesys: 'G_Computed.gPV_Power' },
  { id: 'gPuissance_myPV_Totale_Cable_Rest', label: 'PV → ballons (Rest)', unit: 'W', group: 'pv', codesys: 'G_Computed.gPuissance_myPV_Totale_Cable_Rest' },
  { id: 'gSolarThermal_Power', label: 'Flux solaire thermique', unit: 'W', group: 'pv', codesys: 'G_Computed.gSolarThermal_Power' },

  // --- Flux (usages) — plusieurs encore a definir cote Codesys
  { id: 'flux_radiateurs', label: 'Radiateurs', unit: 'W', group: 'flows', todo: true },
  { id: 'flux_plancher', label: 'Plancher chauffant', unit: 'W', group: 'flows', todo: true },
  { id: 'conso_maison', label: 'Consommation maison', unit: 'W', group: 'flows', todo: true },
  { id: 'ev_charge', label: 'Borne de charge EV', unit: 'W', group: 'flows', todo: true },

  // --- EMS (parametres pilotables a distance) — consignes a definir cote Codesys
  { id: 'pv_split', label: 'Répartition PV ballons / EV', unit: '%', group: 'ems', writable: true, decimals: 0, todo: true },
  { id: 'temp_max_ballons', label: 'Température max ballons', unit: '°C', group: 'ems', writable: true, decimals: 0, todo: true },
  { id: 'xStop_myPV_input', label: 'Interruption chauffage élec.', unit: '', group: 'ems', writable: true, codesys: 'xStop_myPV_input', enumLabels: ['Actif', 'Coupé'] },
  { id: 'xRest_Ballon_Gauche', label: 'Chauffage élec. ballon gauche', unit: '', group: 'ems', writable: true, codesys: 'G_Parameters.xRest_Ballon_Gauche', enumLabels: ['Coupé', 'Actif'] },
  { id: 'xRest_Ballon_Droit', label: 'Chauffage élec. ballon droit', unit: '', group: 'ems', writable: true, codesys: 'G_Parameters.xRest_Ballon_Droit', enumLabels: ['Coupé', 'Actif'], todo: true },
]

export const POINTS_BY_ID: Record<string, MeasurementPoint> = Object.fromEntries(
  MEASUREMENT_POINTS.map((p) => [p.id, p] as [string, MeasurementPoint]),
)

export function pointsByGroup(group: MetricGroup): MeasurementPoint[] {
  return MEASUREMENT_POINTS.filter((p) => p.group === group)
}
