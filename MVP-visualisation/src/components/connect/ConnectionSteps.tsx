import { Check, Loader2 } from 'lucide-react'
import type { ConnectionStep } from '../../types/telemetry'

export function ConnectionSteps({ steps }: { steps: ConnectionStep[] }) {
  return (
    <div className="steps">
      {steps.map((s) => (
        <div key={s.id} className={`step ${s.status}`}>
          <span className="step-ico">
            {s.status === 'done' ? (
              <Check size={13} strokeWidth={3} />
            ) : s.status === 'active' ? (
              <Loader2 size={13} className="spin" />
            ) : (
              <span style={{ width: 5, height: 5, borderRadius: 9, background: 'currentColor' }} />
            )}
          </span>
          <div className="step-txt">
            <div className="step-label">{s.label}</div>
            {s.detail && <div className="step-detail">{s.detail}</div>}
          </div>
        </div>
      ))}
    </div>
  )
}
