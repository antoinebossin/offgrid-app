import { VALVES } from '../../config'

/**
 * Position des 3 vannes (haute droite, haute gauche, milieu). Chaque vanne
 * expose deux booleens Codesys complementaires : _Ouverte / _Fermee.
 */
export function ValvePanel({ values }: { values: Record<string, number> }) {
  return (
    <div className="valve-grid">
      {VALVES.map((valve) => {
        const open = (values[valve.open] ?? 0) === 1
        return (
          <div className="valve" key={valve.key}>
            <div className={`valve-ico ${open ? 'open' : 'closed'}`}>
              <svg viewBox="0 0 32 32" width="26" height="26">
                <line x1="3" y1="16" x2="29" y2="16" stroke="currentColor" strokeWidth="3" strokeLinecap="round" opacity="0.5" />
                <g transform={`rotate(${open ? 0 : 90} 16 16)`} style={{ transition: 'transform 0.3s' }}>
                  <path d="M16 6 L10 12 L22 12 Z M16 26 L10 20 L22 20 Z" fill="currentColor" />
                </g>
              </svg>
            </div>
            <div className="valve-name">{valve.label}</div>
            <div className={`valve-state ${open ? 'open' : 'closed'}`}>{open ? 'Ouverte' : 'Fermée'}</div>
          </div>
        )
      })}
    </div>
  )
}
