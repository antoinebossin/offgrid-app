import { fmtPower } from '../../utils/format'

interface NodeDef {
  id: string
  x: number
  y: number
  label: string
  value: string
  color: string
  todo?: boolean
}

function Node({ n }: { n: NodeDef }) {
  const w = 62, h = 38
  return (
    <g>
      <rect
        x={n.x - w / 2}
        y={n.y - h / 2}
        width={w}
        height={h}
        rx={10}
        fill="#0b1322"
        stroke={n.color}
        strokeWidth={1.6}
        strokeDasharray={n.todo ? '3 3' : undefined}
        opacity={n.todo ? 0.7 : 1}
      />
      <text x={n.x} y={n.y - 4} textAnchor="middle" className="flow-node-label">{n.label}</text>
      <text x={n.x} y={n.y + 9} textAnchor="middle" className="flow-node-val" fill={n.color}>{n.value}</text>
    </g>
  )
}

function Edge({ from, to, color, active, dir = 1 }: { from: NodeDef; to: NodeDef; color: string; active: boolean; dir?: number }) {
  return (
    <line
      className={`flow-line ${active ? 'active' : ''}`}
      x1={from.x}
      y1={from.y + 19}
      x2={to.x}
      y2={to.y - 19}
      stroke={color}
      style={dir < 0 ? { animationDirection: 'reverse' } : undefined}
    />
  )
}

export function EnergyFlow({ values }: { values: Record<string, number> }) {
  const v = (id: string) => values[id] ?? 0
  const p = (id: string) => {
    const f = fmtPower(v(id))
    return `${f.value} ${f.unit}`
  }
  const battP = v('gBatterie_Puissance')
  const ballonTemp = (v('gBallonHautD') + v('gBallonHautG')) / 2

  const nodes: Record<string, NodeDef> = {
    pv: { id: 'pv', x: 56, y: 34, label: 'PV', value: p('gPV_Power'), color: '#f59e0b' },
    boiler: { id: 'boiler', x: 170, y: 30, label: 'Bouilleur', value: p('gBoiler_Power'), color: '#ef4444' },
    solar: { id: 'solar', x: 284, y: 34, label: 'Solaire th.', value: p('gSolarThermal_Power'), color: '#fb923c' },
    ballon: { id: 'ballon', x: 118, y: 162, label: 'Ballons', value: `${ballonTemp.toFixed(0)} °C`, color: '#fb923c' },
    battery: { id: 'battery', x: 250, y: 158, label: 'Batterie', value: `${v('gBatterie_SOC').toFixed(0)} %`, color: '#34d399' },
    house: { id: 'house', x: 48, y: 292, label: 'Maison', value: p('conso_maison'), color: '#a78bfa', todo: true },
    rad: { id: 'rad', x: 130, y: 298, label: 'Radiateurs', value: p('flux_radiateurs'), color: '#a78bfa', todo: true },
    floor: { id: 'floor', x: 214, y: 298, label: 'Plancher', value: p('flux_plancher'), color: '#a78bfa', todo: true },
    ev: { id: 'ev', x: 296, y: 292, label: 'Borne EV', value: p('ev_charge'), color: '#38bdf8', todo: true },
  }

  return (
    <svg className="flow-svg" viewBox="0 0 340 330">
      {/* Sources -> stockage */}
      <Edge from={nodes.pv} to={nodes.ballon} color="#f59e0b" active={v('gPuissance_myPV_Totale_Cable_Rest') > 50} />
      <Edge from={nodes.pv} to={nodes.battery} color="#f59e0b" active={battP > 50} />
      <Edge from={nodes.boiler} to={nodes.ballon} color="#ef4444" active={v('gBoiler_Power') > 50} />
      <Edge from={nodes.solar} to={nodes.ballon} color="#fb923c" active={v('gSolarThermal_Power') > 300} />
      <Edge from={nodes.solar} to={nodes.battery} color="#fb923c" active={false} />
      {/* Stockage -> usages */}
      <Edge from={nodes.ballon} to={nodes.rad} color="#fb923c" active={v('flux_radiateurs') > 50} />
      <Edge from={nodes.ballon} to={nodes.floor} color="#fb923c" active={v('flux_plancher') > 50} />
      <Edge from={nodes.battery} to={nodes.house} color="#34d399" active={battP < -50} dir={-1} />
      <Edge from={nodes.pv} to={nodes.ev} color="#38bdf8" active={v('ev_charge') > 50} />

      {Object.values(nodes).map((n) => (
        <Node key={n.id} n={n} />
      ))}
    </svg>
  )
}
