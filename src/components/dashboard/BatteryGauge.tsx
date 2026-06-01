import { ArrowDown, ArrowUp, Minus } from 'lucide-react'
import { fmtPower } from '../../utils/format'

function socColor(soc: number): string {
  if (soc >= 50) return '#34d399'
  if (soc >= 20) return '#fbbf24'
  return '#f87171'
}

export function BatteryGauge({ soc, power }: { soc: number; power: number }) {
  const color = socColor(soc)
  const fill = Math.max(2, Math.min(100, soc))
  const p = fmtPower(Math.abs(power))
  const charging = power > 30
  const discharging = power < -30
  const fluxColor = charging ? '#34d399' : discharging ? '#fbbf24' : '#6f7c93'

  return (
    <div className="batt-card">
      <div className="batt-vis">
        <svg viewBox="0 0 60 112" width="100%">
          <rect x="22" y="2" width="16" height="6" rx="2" fill={color} opacity="0.7" />
          <rect x="6" y="9" width="48" height="99" rx="11" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="3" />
          <clipPath id="bclip">
            <rect x="9" y="12" width="42" height="93" rx="8" />
          </clipPath>
          <g clipPath="url(#bclip)">
            <rect x="9" y={12 + (93 * (100 - fill)) / 100} width="42" height={(93 * fill) / 100} fill={color} opacity="0.85" />
          </g>
        </svg>
      </div>
      <div className="batt-info">
        <div className="eyebrow">Batterie · état de charge</div>
        <div className="batt-soc" style={{ color }}>
          {Math.round(soc)}
          <span style={{ fontSize: 18 }}>%</span>
        </div>
        <div className="batt-flux" style={{ color: fluxColor }}>
          {charging ? <ArrowUp size={15} /> : discharging ? <ArrowDown size={15} /> : <Minus size={15} />}
          {charging ? 'En charge' : discharging ? 'En décharge' : 'Au repos'} · {p.value} {p.unit}
        </div>
      </div>
    </div>
  )
}
