import type { PlcDataSource } from './PlcDataSource'
import type { HistoryPoint, Snapshot } from '../../types/telemetry'
import { CONFIG } from '../config'
import { SEUILS } from '../../data/measurementPoints'

// Acceleration du temps simule : 1 s reelle = SIM_DT s simulees,
// pour que le cycle jour/nuit, la batterie et les ballons evoluent en demo.
const SIM_DT = 90
const BATTERY_CAPACITY_WH = 15000
const PV_PEAK_W = 6000

/**
 * Jumeau simplifie de l'installation de Montchauvel : memes grandeurs et
 * memes noms de variables que l'automate. Les 5 ampoules d'alarme sont
 * calculees avec la LOGIQUE EXACTE du programme `Alarmes` de Codesys, pour
 * que le comportement visuel soit fidele a la cible.
 */
export class MockPlcDataSource implements PlcDataSource {
  private values: Record<string, number> = {}
  private history: HistoryPoint[] = []
  private timer: ReturnType<typeof setInterval> | null = null
  private subscribers = new Set<(s: Snapshot) => void>()
  private clockH: number
  private boilerEtat = 0 // Bouilleur.Etat (0..3)

  constructor() {
    const now = new Date()
    this.clockH = now.getHours() + now.getMinutes() / 60
    this.seed()
  }

  // --- API publique --------------------------------------------------------

  start(): void {
    if (this.timer !== null) return
    if (this.history.length === 0) {
      const now = Date.now()
      for (let i = 30; i >= 1; i--) {
        this.step(SIM_DT)
        this.history[this.history.length - 1].t = now - i * CONFIG.pollingIntervalMs
      }
    }
    this.timer = setInterval(() => {
      this.step(SIM_DT)
      const snap = this.snapshot()
      this.subscribers.forEach((cb) => cb(snap))
    }, CONFIG.pollingIntervalMs)
  }

  stop(): void {
    if (this.timer !== null) {
      clearInterval(this.timer)
      this.timer = null
    }
  }

  subscribe(cb: (s: Snapshot) => void): () => void {
    this.subscribers.add(cb)
    cb(this.snapshot())
    return () => {
      this.subscribers.delete(cb)
    }
  }

  getHistory(): HistoryPoint[] {
    return [...this.history]
  }

  getValue(id: string): number {
    return this.values[id] ?? 0
  }

  async writeParameter(id: string, value: number): Promise<void> {
    await new Promise<void>((r) => setTimeout(r, 400)) // latence tunnel simulee
    this.values[id] = value
    this.computeDistribution()
    this.computeAlarms()
    const snap = this.snapshot()
    this.subscribers.forEach((cb) => cb(snap))
  }

  // --- Interne -------------------------------------------------------------

  private rand(amp: number): number {
    return (Math.random() - 0.5) * 2 * amp
  }

  private snapshot(): Snapshot {
    return { t: Date.now(), values: { ...this.values } }
  }

  private seed(): void {
    const v = this.values
    // Consignes pilotables (a definir cote Codesys — valeurs de depart)
    v.pv_split = 60 // % de la puissance PV surplus vers les ballons (vs EV)
    v.temp_max_ballons = 65 // garde-fou 40..80
    v.xStop_myPV_input = 0 // 0 = chauffage elec actif, 1 = coupe
    v.xRest_Ballon_Gauche = 1
    v.xRest_Ballon_Droit = 1
    // Etats persistants
    v.gBatterie_SOC = 74
    v.gBallonHautD = 58
    v.gBallonBasD = 47
    v.gBallonHautG = 52
    v.gBallonBasG = 43
    this.step(0)
  }

  private step(dt: number): void {
    this.clockH = (this.clockH + dt / 3600) % 24
    const h = this.clockH
    const v = this.values

    // --- Ambiances
    v.gExterieur = 8 + 7 * Math.sin(((h - 9) / 24) * 2 * Math.PI) + this.rand(0.4)
    v.gSalon = 20 + 1.4 * Math.sin(((h - 14) / 24) * 2 * Math.PI) + this.rand(0.15)

    // --- Ensoleillement / PV (cloche 6h-20h, pic 13h + variation nuageuse)
    const day = Math.max(0, Math.sin(((h - 6) / 14) * Math.PI))
    const cloud = clamp(0.78 + 0.22 * Math.sin(h * 1.7 + 1), 0.45, 1)
    const pv = Math.max(0, PV_PEAK_W * day * cloud + this.rand(70))
    v.gPV_Power = pv

    // --- Solaire thermique
    v.gSolarThermal_Power = Math.max(0, 2600 * day + this.rand(60))

    // --- Fourneau bouilleur : machine a etats (reproduction Bouilleur PRG)
    const cold = v.gExterieur < 10
    const flow2 = (h < 8 || h > 18) && cold ? 1 : 0 // rValue_Flow_2 > 0 => en marche
    // temperature d'entree fourneau qui monte quand il chauffe
    const targetRTemp = flow2 ? 46 + 8 * Math.max(0, Math.sin((h % 6) / 6 * Math.PI)) : 26
    v.rValue_RTemp_2 = (v.rValue_RTemp_2 ?? 26) + (targetRTemp - (v.rValue_RTemp_2 ?? 26)) * 0.25 + this.rand(0.4)
    this.stepBoilerState(flow2, v.rValue_RTemp_2)
    v.xBouilleur = this.boilerEtat > 0 ? 1 : 0
    // Chauffe rapide : gradient fort quand le fourneau pousse
    v.ChauffeRapide = this.boilerEtat >= 2 && v.rValue_RTemp_2 > 44 ? 1 : 0
    v.gBoiler_Power = this.boilerEtat > 0 ? 9000 + this.rand(600) : 0

    // --- Ballons : chauffes par bouilleur (bas) et solaire/PV (variable)
    const heatIn = (v.gBoiler_Power > 0 ? 0.9 : 0) + (v.gSolarThermal_Power > 500 ? 0.6 : 0)
    const cool = 0.35 // pertes + soutirage ECS
    const tmax = v.temp_max_ballons
    v.gBallonBasD = clamp(v.gBallonBasD + (heatIn - cool) * dt / 240 + this.rand(0.2), 20, tmax + 6)
    v.gBallonHautD = clamp(Math.max(v.gBallonHautD, v.gBallonBasD + 6) + (heatIn * 0.5 - cool) * dt / 260 + this.rand(0.2), 22, tmax + 10)
    v.gBallonBasG = clamp(v.gBallonBasG + (heatIn * 0.7 - cool) * dt / 260 + this.rand(0.2), 20, tmax + 6)
    v.gBallonHautG = clamp(Math.max(v.gBallonHautG, v.gBallonBasG + 5) + (heatIn * 0.4 - cool) * dt / 280 + this.rand(0.2), 22, tmax + 10)

    // --- Vannes : regle simplifiee mais plausible (recharge = bouilleur actif)
    const recharge = v.gBoiler_Power > 0
    setBool(v, 'VanneHD_Ouverte', recharge)
    setBool(v, 'VanneHG_Ouverte', !recharge)
    setBool(v, 'VanneM_Ouverte', v.gSolarThermal_Power > 500 || v.gPuissance_myPV_Totale_Cable_Rest > 100)
    setBool(v, 'VanneHD_Fermee', !bool(v, 'VanneHD_Ouverte'))
    setBool(v, 'VanneHG_Fermee', !bool(v, 'VanneHG_Ouverte'))
    setBool(v, 'VanneM_Fermee', !bool(v, 'VanneM_Ouverte'))

    // --- Consommation maison + usages (plusieurs a definir)
    const morning = Math.exp(-Math.pow(h - 7.5, 2) / 2)
    const evening = Math.exp(-Math.pow(h - 19.5, 2) / 3)
    const load = 320 + 1500 * morning + 2200 * evening + 260 * day + this.rand(55)
    v.conso_maison = load
    v.flux_radiateurs = cold ? 1400 + this.rand(120) : 0
    v.flux_plancher = cold ? 900 + this.rand(80) : 0

    // --- Batterie : bilan electrique pv - conso, borne l'EV se sert du surplus
    let batt = pv - load // + => charge
    const soc = v.gBatterie_SOC
    if (batt > 0 && soc >= 100) batt = 0
    if (batt < 0 && soc <= 3) batt = 0
    v.gBatterie_Puissance = batt
    v.gBatterie_Temperature = 16 + 0.12 * (soc - 50) + Math.abs(batt) / PV_PEAK_W * 4 + this.rand(0.25)
    const dSoc = (batt * (dt / 3600)) / BATTERY_CAPACITY_WH * 100
    v.gBatterie_SOC = clamp(soc + dSoc, 2, 100)

    // --- Repartition de la puissance PV (surplus -> ballons / EV)
    this.computeDistribution()

    // --- Alarmes (logique Codesys exacte)
    this.computeAlarms()

    // --- Historique (pour le graphe de repartition PV)
    this.history.push({
      t: Date.now(),
      pv,
      battery: batt,
      ev: v.ev_charge,
      ballon: v.gPuissance_myPV_Totale_Cable_Rest,
      soc: v.gBatterie_SOC,
    })
    if (this.history.length > CONFIG.historyLength) this.history.shift()
  }

  /** Machine a etats du fourneau bouilleur (Bouilleur PRG). */
  private stepBoilerState(flow2: number, rtemp: number): void {
    const S1 = 40, S2 = 50, D = 2
    if (flow2 > 0 && this.boilerEtat === 0) this.boilerEtat = 1
    else if (this.boilerEtat > 0 && flow2 === 0) this.boilerEtat = 0
    if (this.boilerEtat === 1) {
      if (rtemp > S1) this.boilerEtat = 2
    } else if (this.boilerEtat === 2) {
      if (rtemp < S1 - D) this.boilerEtat = 1
      else if (rtemp > S2) this.boilerEtat = 3
    } else if (this.boilerEtat === 3) {
      if (rtemp < S2 - D) this.boilerEtat = 2
    }
  }

  /** Repartition du surplus PV entre chauffage ballons et borne EV. */
  private computeDistribution(): void {
    const v = this.values
    const surplus = Math.max(0, (v.gPV_Power ?? 0) - (v.conso_maison ?? 0) - Math.max(0, v.gBatterie_Puissance ?? 0))
    const restActif = (v.xStop_myPV_input ?? 0) === 0 && ((v.xRest_Ballon_Gauche ?? 0) === 1 || (v.xRest_Ballon_Droit ?? 0) === 1)
    const split = clamp(v.pv_split ?? 60, 0, 100) / 100
    v.gPuissance_myPV_Totale_Cable_Rest = restActif ? surplus * split : 0
    v.ev_charge = surplus - (v.gPuissance_myPV_Totale_Cable_Rest ?? 0)
  }

  /** Calcul des 5 groupes d'alarmes — copie fidele du programme `Alarmes`. */
  private computeAlarms(): void {
    const v = this.values

    // Batterie SOC : R<35 · J<55 · sinon V
    const soc = v.gBatterie_SOC
    triColor(v, 'Batterie_SOC', soc < 35 ? 'red' : soc < 55 ? 'amber' : 'green')

    // Temperature batterie : R hors [5,25] · J hors [10,20] · sinon V
    const tb = v.gBatterie_Temperature
    triColor(v, 'Temp_Batterie', tb < 5 || tb > 25 ? 'red' : tb < 10 || tb > 20 ? 'amber' : 'green')

    // Ballons (FbAlarme_Ballon) : R si haut>75 & bas>65 · J si bas>55 · sinon V
    for (const side of ['G', 'D'] as const) {
      const th = v[`gBallonHaut${side}`]
      const tbb = v[`gBallonBas${side}`]
      const lvl = th > SEUILS.ballon_H && tbb > SEUILS.ballon_B2 ? 'red' : tbb > SEUILS.ballon_B1 ? 'amber' : 'green'
      triColor(v, `Ballon${side}`, lvl)
    }

    // Bouilleur : R si (Etat=2 & ChauffeRapide) ou Etat=3 · J si Etat=2 ou (Etat=1 & ChauffeRapide) · sinon V
    const et = this.boilerEtat
    const cr = v.ChauffeRapide === 1
    const bl = (et === 2 && cr) || et === 3 ? 'red' : et === 2 || (et === 1 && cr) ? 'amber' : 'green'
    triColor(v, 'Bouilleur', bl)
  }
}

// --- petits helpers booleens / feux -----------------------------------------
function clamp(x: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, x))
}
function bool(v: Record<string, number>, id: string): boolean {
  return (v[id] ?? 0) === 1
}
function setBool(v: Record<string, number>, id: string, b: boolean): void {
  v[id] = b ? 1 : 0
}
/** Ecrit les 3 LED V/J/R d'un groupe d'alarme a partir du niveau actif. */
function triColor(v: Record<string, number>, prefix: string, level: 'green' | 'amber' | 'red'): void {
  v[`${prefix}_AlarmV`] = level === 'green' ? 1 : 0
  v[`${prefix}_AlarmJ`] = level === 'amber' ? 1 : 0
  v[`${prefix}_AlarmR`] = level === 'red' ? 1 : 0
}
// alarmes V/J/R fidèles au programme CODESYS `Alarmes`
