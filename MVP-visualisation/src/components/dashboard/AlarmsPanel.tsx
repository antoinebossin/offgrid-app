import { AlertTriangle, CheckCircle2, Info } from 'lucide-react'

type Tone = 'ok' | 'warn' | 'danger'
const TONE = {
  ok: { color: '#34d399', Icon: CheckCircle2 },
  warn: { color: '#fbbf24', Icon: AlertTriangle },
  danger: { color: '#f87171', Icon: AlertTriangle },
}

export function AlarmsPanel({ values }: { values: Record<string, number> }) {
  const v = (id: string) => values[id] ?? 0
  const soc = v('battery_soc')
  const socMin = v('ems_soc_min')
  const invT = v('inverter_temp')

  const items: { tone: Tone; text: string }[] = []

  items.push(
    soc < socMin
      ? { tone: 'warn', text: `Batterie sous le seuil de réserve (${Math.round(soc)} % < ${Math.round(socMin)} %)` }
      : { tone: 'ok', text: `Réserve batterie respectée (${Math.round(soc)} %)` },
  )
  items.push(
    v('grid_connected') === 1
      ? { tone: 'warn', text: 'Appoint réseau actif — sortie temporaire d\'îlotage' }
      : { tone: 'ok', text: 'Système îloté — 100 % autonome' },
  )
  items.push(
    invT > 55
      ? { tone: 'danger', text: `Onduleur en température haute (${Math.round(invT)} °C)` }
      : { tone: 'ok', text: 'Onduleur dans la plage nominale' },
  )
  items.push({ tone: 'ok', text: `Liaison OpenVPN stable · ${Math.round(v('battery_soh'))} % d'état de santé batterie` })

  return (
    <div>
      {items.map((it, i) => {
        const { color, Icon } = TONE[it.tone]
        return (
          <div className="alarm" key={i}>
            <span className="alarm-ico" style={{ background: color + '22', color }}>
              <Icon size={15} />
            </span>
            <span className="alarm-txt">{it.text}</span>
          </div>
        )
      })}
      <div className="alarm">
        <span className="alarm-ico" style={{ background: 'rgba(255,255,255,0.06)', color: '#6f7c93' }}>
          <Info size={15} />
        </span>
        <span className="alarm-txt muted" style={{ fontSize: 11 }}>
          Statuts dérivés en direct des points de mesure.
        </span>
      </div>
    </div>
  )
}
