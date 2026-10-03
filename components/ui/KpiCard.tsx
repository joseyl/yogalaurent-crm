interface KpiCardProps {
  label: string
  value: string | number
  helper?: string
  children?: React.ReactNode
}

export default function KpiCard({ label, value, helper, children }: KpiCardProps) {
  return (
    <div className="card p-5">
      <p className="text-xs font-medium text-muted uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold text-heading mt-1">{value}</p>
      {helper && <p className="text-xs text-muted mt-1">{helper}</p>}
      {children}
    </div>
  )
}
