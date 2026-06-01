import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { HistoryPoint } from '../../types/telemetry'
import { fmtClock } from '../../utils/format'

export function LiveChart({ history }: { history: HistoryPoint[] }) {
  const data = history.map((h) => ({
    time: fmtClock(h.t),
    PV: Math.round(h.pv),
    Conso: Math.round(h.load),
    SoC: Math.round(h.soc),
  }))

  return (
    <div style={{ width: '100%', height: 172 }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 6, right: 2, left: -20, bottom: 0 }}>
          <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
          <XAxis dataKey="time" tick={{ fill: '#6f7c93', fontSize: 9 }} minTickGap={44} axisLine={false} tickLine={false} />
          <YAxis yAxisId="w" tick={{ fill: '#6f7c93', fontSize: 9 }} axisLine={false} tickLine={false} width={42} />
          <YAxis yAxisId="soc" orientation="right" domain={[0, 100]} hide />
          <Tooltip
            contentStyle={{ background: '#0b1322', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, fontSize: 12 }}
            labelStyle={{ color: '#aab4c8' }}
            formatter={(value: any, name: any) => [name === 'SoC' ? `${value} %` : `${value} W`, name]}
          />
          <Line yAxisId="w" type="monotone" dataKey="PV" stroke="#f59e0b" strokeWidth={2} dot={false} isAnimationActive={false} />
          <Line yAxisId="w" type="monotone" dataKey="Conso" stroke="#a78bfa" strokeWidth={2} dot={false} isAnimationActive={false} />
          <Line yAxisId="soc" type="monotone" dataKey="SoC" stroke="#34d399" strokeWidth={1.5} strokeDasharray="4 4" dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
