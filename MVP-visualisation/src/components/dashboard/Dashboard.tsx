import { useState } from 'react'
import { Activity, CheckCircle2, Cpu, Gauge, Home, Power, Settings2, ShieldCheck, Sun } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { useTelemetry } from '../../hooks/useTelemetry'
import { StatusBar } from '../StatusBar'
import { Card } from '../common/Card'
import { BatteryGauge } from './BatteryGauge'
import { PowerFlow } from './PowerFlow'
import { LiveChart } from './LiveChart'
import { MetricTile } from './MetricTile'
import { ParameterControls } from './ParameterControls'
import { AlarmsPanel } from './AlarmsPanel'
import { CATEGORY_META, pointsByCategory } from '../../data/measurementPoints'
import { EMS_MODES, fmtNumber, fmtPower } from '../../utils/format'
import type { MetricCategory } from '../../types/telemetry'

const TILE_CATEGORIES: MetricCategory[] = ['pv', 'battery', 'thermal', 'inverter', 'load', 'grid', 'environment', 'boiler']

export function Dashboard() {
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

  const v = (id: string) => snapshot.values[id] ?? 0
  const pv = fmtPower(v('pv_power'))
  const load = fmtPower(v('load_power'))

  return (
    <>
      <StatusBar />
      <div className="screen-scroll">
        <div className="dash-head">
          <div>
            <div className="brand-name" style={{ fontSize: 16 }}>Off-the-Grid</div>
            <span className="pill pill-ok" style={{ marginTop: 5 }}>
              <span className="dot dot-pulse" /> Connecté · OpenVPN · 4G
            </span>
          </div>
          <button className="icon-btn" onClick={disconnect} title="Se déconnecter">
            <Power size={18} />
          </button>
        </div>

        <div className="card">
          <BatteryGauge soc={v('battery_soc')} power={v('battery_power')} />
        </div>

        <div className="kpi-grid" style={{ marginBottom: 14 }}>
          <div className="kpi">
            <div className="kpi-label"><Sun size={12} color="#f59e0b" /> Production PV</div>
            <div className="kpi-value">{pv.value}<small>{pv.unit}</small></div>
          </div>
          <div className="kpi">
            <div className="kpi-label"><Home size={12} color="#a78bfa" /> Consommation</div>
            <div className="kpi-value">{load.value}<small>{load.unit}</small></div>
          </div>
          <div className="kpi">
            <div className="kpi-label"><Cpu size={12} color="#60a5fa" /> Mode EMS</div>
            <div className="kpi-value" style={{ fontSize: 18 }}>{EMS_MODES[v('ems_mode')]}</div>
          </div>
          <div className="kpi">
            <div className="kpi-label"><Gauge size={12} color="#2dd4bf" /> Ensoleillement</div>
            <div className="kpi-value">{fmtNumber(v('env_irradiance'))}<small>W/m²</small></div>
          </div>
        </div>

        <Card title="Flux d'énergie" icon={<Activity size={16} />} color="#34d399">
          <PowerFlow pv={v('pv_power')} load={v('load_power')} battery={v('battery_power')} grid={v('grid_import_power')} />
        </Card>

        <Card title="Temps réel" icon={<Gauge size={16} />} color="#38bdf8" right={<span className="chip">PV · Conso · SoC</span>}>
          <LiveChart history={history} />
        </Card>

        <Card title="Pilotage des paramètres" icon={<Settings2 size={16} />} color="#60a5fa" right={<span className="chip"><ShieldCheck size={11} /> garde-fous</span>}>
          <ParameterControls values={snapshot.values} onToast={showToast} />
        </Card>

        <Card title="État système" icon={<CheckCircle2 size={16} />} color="#34d399">
          <AlarmsPanel values={snapshot.values} />
        </Card>

        <div className="section-label"><span className="bar" style={{ background: '#38bdf8' }} /> Tous les points de mesure</div>
        {TILE_CATEGORIES.map((cat) => {
          const pts = pointsByCategory(cat).filter((p) => !p.writable)
          if (!pts.length) return null
          const meta = CATEGORY_META[cat]
          return (
            <div key={cat} style={{ marginBottom: 14 }}>
              <div className="section-label" style={{ marginTop: 6 }}>
                <span className="bar" style={{ background: meta.color }} /> {meta.label}
              </div>
              <div className="tile-grid">
                {pts.map((p) => (
                  <MetricTile key={p.id} point={p} value={v(p.id)} />
                ))}
              </div>
            </div>
          )
        })}

        <div className="chip" style={{ marginTop: 6 }}>
          <ShieldCheck size={12} /> Démo · données simulées · tunnel OpenVPN simulé
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
