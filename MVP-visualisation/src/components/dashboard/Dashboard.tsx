import { useState } from 'react'
import { Activity, AlertTriangle, Battery, Droplet, Flame, GitBranch, Power, Settings2, ShieldCheck, Sun, Thermometer, User } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { useTelemetry } from '../../hooks/useTelemetry'
import { StatusBar } from '../StatusBar'
import { Card } from '../common/Card'
import { BatteryGauge } from './BatteryGauge'
import { AlarmLampPanel } from './AlarmLampPanel'
import { ValvePanel } from './ValvePanel'
import { EnergyFlow } from './EnergyFlow'
import { PvChart } from './PvChart'
import { PvControls } from './PvControls'
import { MetricTile } from './MetricTile'
import { PilotageButton } from './PilotageButton'
import { CONFIG, POINTS_BY_ID, SEUILS } from '../../config'
import { fmtNumber, fmtTemp } from '../../utils/format'
import { CheckCircle2 } from 'lucide-react'

function Tiles({ ids, values }: { ids: string[]; values: Record<string, number> }) {
  return (
    <div className="tile-grid">
      {ids.map((id) => {
        const point = POINTS_BY_ID[id]
        if (!point) return null
        return <MetricTile key={id} point={point} value={values[id] ?? 0} />
      })}
    </div>
  )
}

export function Dashboard({ onOpenProfile }: { onOpenProfile: () => void }) {
  const { disconnect } = useApp()
  const { snapshot, history } = useTelemetry()
  const [toast, setToast] = useState<string | null>(null)

  function showToast(msg: string) {
    setToast(msg)
    window.setTimeout(() => setToast(null), 2600)
  }

  if (!snapshot) {
    return (
      <>
        <StatusBar />
        <div className="screen-scroll">
          <div className="muted" style={{ padding: 40, textAlign: 'center' }}>Récupération des données…</div>
        </div>
      </>
    )
  }

  const values = snapshot.values
  const v = (id: string) => values[id] ?? 0

  return (
    <>
      <StatusBar />
      <div className="screen-scroll">
        <div className="dash-head">
          <div>
            <div className="brand-name" style={{ fontSize: 16 }}>{CONFIG.site.name}</div>
            <span className="pill pill-ok" style={{ marginTop: 5 }}>
              <span className="dot dot-pulse" /> Connecté · OpenVPN · 4G
            </span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="icon-btn" onClick={onOpenProfile} title="Profil de l'installation">
              <User size={18} />
            </button>
            <button className="icon-btn" onClick={disconnect} title="Se déconnecter">
              <Power size={18} />
            </button>
          </div>
        </div>

        <PilotageButton />

        {/* ================= SECTION 1 — Etat energetique ================= */}
        <div className="section-label"><span className="bar" style={{ background: '#34d399' }} /> 1 · État énergétique en un coup d'œil</div>

        <Card title="Panneau d'alarmes · 5 ampoules" icon={<AlertTriangle size={16} />} color="#fbbf24">
          <AlarmLampPanel values={values} />
        </Card>

        <Card title="Batterie domestique" icon={<Battery size={16} />} color="#34d399">
          <BatteryGauge soc={v('gBatterie_SOC')} power={v('gBatterie_Puissance')} />
          <div style={{ marginTop: 12 }}>
            <Tiles ids={['gBatterie_Temperature', 'gBatterie_Puissance']} values={values} />
          </div>
        </Card>

        <Card
          title="Ballons"
          icon={<Droplet size={16} />}
          color="#fb923c"
          right={<span className="chip">seuils {SEUILS.ballon_B1}/{SEUILS.ballon_B2}/{SEUILS.ballon_H} °C</span>}
        >
          <Tiles ids={['gBallonHautD', 'gBallonBasD', 'gBallonHautG', 'gBallonBasG']} values={values} />
        </Card>

        <Card title="Position des vannes" icon={<GitBranch size={16} />} color="#38bdf8">
          <ValvePanel values={values} />
        </Card>

        <Card title="Ambiances" icon={<Thermometer size={16} />} color="#2dd4bf">
          <Tiles ids={['gExterieur', 'gSalon']} values={values} />
        </Card>

        {/* ================= SECTION 2 — Flux energetiques ================= */}
        <div className="section-label"><span className="bar" style={{ background: '#a78bfa' }} /> 2 · Flux énergétiques</div>

        <Card title="Flux d'énergie" icon={<Activity size={16} />} color="#a78bfa" right={<span className="chip">sources · stockage · usages</span>}>
          <EnergyFlow values={values} />
        </Card>

        <Card title="Fourneau bouilleur" icon={<Flame size={16} />} color="#ef4444">
          <div className="kpi-grid">
            <div className="kpi">
              <div className="kpi-label"><Flame size={12} color="#ef4444" /> État</div>
              <div className="kpi-value" style={{ fontSize: 18 }}>{v('xBouilleur') === 1 ? 'Marche' : 'Arrêt'}</div>
            </div>
            <div className="kpi">
              <div className="kpi-label"><Activity size={12} color="#fbbf24" /> Chauffe rapide</div>
              <div className="kpi-value" style={{ fontSize: 18 }}>{v('ChauffeRapide') === 1 ? 'Oui' : 'Non'}</div>
            </div>
          </div>
          <div style={{ marginTop: 10 }}>
            <Tiles ids={['rValue_RTemp_2', 'gBoiler_Power']} values={values} />
          </div>
        </Card>

        {/* ================= SECTION 3 — Repartition PV ================= */}
        <div className="section-label"><span className="bar" style={{ background: '#f59e0b' }} /> 3 · Répartition de la puissance PV</div>

        <Card title="Répartition PV · temps réel" icon={<Sun size={16} />} color="#f59e0b" right={<span className="chip">PV · Batt · Ballons · EV</span>}>
          <PvChart history={history} />
        </Card>

        <Card title="Pilotage de la répartition" icon={<Settings2 size={16} />} color="#60a5fa" right={<span className="chip"><ShieldCheck size={11} /> garde-fous</span>}>
          <PvControls values={values} onToast={showToast} />
        </Card>

        <div className="chip" style={{ marginTop: 6 }}>
          <ShieldCheck size={12} /> Démo · données simulées · variables CODESYS réelles · tunnel OpenVPN simulé
        </div>
      </div>

      {toast && (
        <div className="toast">
          <CheckCircle2 size={18} color="#34d399" />
          <span className="t-txt">{toast}</span>
        </div>
      )}
    </>
  )
}
// section 1 · 2 · 3 — spec dashboard François
