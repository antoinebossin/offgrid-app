import type { ReactNode } from 'react'

export function Card({
  title,
  icon,
  color,
  right,
  children,
}: {
  title?: ReactNode
  icon?: ReactNode
  color?: string
  right?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="card">
      {(title || right) && (
        <div className="card-head">
          <div className="card-title">
            {icon && (
              <span className="card-ico" style={{ background: color ? color + '22' : undefined, color }}>
                {icon}
              </span>
            )}
            {title}
          </div>
          {right}
        </div>
      )}
      {children}
    </div>
  )
}
