interface PageHeaderProps {
  title: string
  subtitle?: string
  badge?: React.ReactNode
  actions?: React.ReactNode
}

export default function PageHeader({ title, subtitle, badge, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between mb-6">
      <div>
        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="text-xl font-bold text-heading">{title}</h1>
          {badge}
        </div>
        {subtitle && <p className="text-sm text-muted mt-0.5">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 mt-2 sm:mt-0 flex-shrink-0">{actions}</div>}
    </div>
  )
}
