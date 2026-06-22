import { fmtPower } from '../../utils/format'

function Node({ x, y, label, value, color }: { x: number; y: number; label: string; value: string; color: string }) {
  return (
    <g>
      <circle cx={x} cy={y} r={26} fill="#0b1322" stroke={color} strokeWidth={2} />
      <text x={x} y={y - 3} textAnchor="middle" className="flow-node-label">{label}</text>
      <text x={x} y={y + 11} textAnchor="middle" className="flow-node-val" fill={color}>{value}</text>
    </g>
  )
}

export function PowerFlow({ pv, load, battery, grid }: { pv: number; load: number; battery: number; grid: number }) {
  const charging = battery > 30
  const discharging = battery < -30
  const importing = grid > 30
  const pvP = fmtPower(pv)
  const loadP = fmtPower(load)
  const battP = fmtPower(Math.abs(battery))
  const gridP = fmtPower(grid)

  return (
    <svg className="flow-svg" viewBox="0 0 320 220">
      <line className={`flow-line ${pv > 20 ? 'active' : ''}`} x1={160} y1={58} x2={160} y2={94} stroke="#f59e0b" />
      <line className={`flow-line ${load > 20 ? 'active' : ''}`} x1={160} y1={138} x2={160} y2={164} stroke="#a78bfa" />
      <line
        className={`flow-line ${charging || discharging ? 'active' : ''}`}
        x1={182} y1={116} x2={252} y2={116} stroke="#34d399"
        style={discharging ? { animationDirection: 'reverse' } : undefined}
      />
      <line className={`flow-line ${importing ? 'active' : ''}`} x1={68} y1={116} x2={138} y2={116} stroke="#94a3b8" />

      <circle cx={160} cy={116} r={6} fill="#1a2540" stroke="rgba(255,255,255,0.22)" strokeWidth={1.5} />

      <Node x={160} y={32} label="PV" value={`${pvP.value} ${pvP.unit}`} color="#f59e0b" />
      <Node x={160} y={190} label="Maison" value={`${loadP.value} ${loadP.unit}`} color="#a78bfa" />
      <Node x={278} y={116} label={charging ? 'Batt ↑' : discharging ? 'Batt ↓' : 'Batt'} value={`${battP.value} ${battP.unit}`} color="#34d399" />
      <Node x={42} y={116} label="Réseau" value={importing ? `${gridP.value} ${gridP.unit}` : 'Îloté'} color="#94a3b8" />
    </svg>
  )
}
