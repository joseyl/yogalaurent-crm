interface CardProps {
  title?: string
  action?: React.ReactNode
  children: React.ReactNode
  className?: string
}

export default function Card({ title, action, children, className = '' }: CardProps) {
  return (
    <div className={`card ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between px-5 py-4 border-b border-card-border">
          {title && <h2 className="text-sm font-semibold text-heading">{title}</h2>}
          {action && <div>{action}</div>}
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  )
}
