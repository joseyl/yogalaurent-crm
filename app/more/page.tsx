import Link from 'next/link'

function IconBarChart() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
      <line x1="2" y1="20" x2="22" y2="20" />
    </svg>
  )
}

function IconPackage() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  )
}

export default function MorePage() {
  return (
    <div className="max-w-lg">
      <h1 className="text-xl font-bold text-heading mb-6">More</h1>
      <div className="flex flex-col gap-3">
        <Link
          href="/reports"
          className="flex items-center gap-4 p-4 card hover:bg-grey-subtle transition-colors"
          style={{ textDecoration: 'none' }}
        >
          <span className="text-accent">
            <IconBarChart />
          </span>
          <div>
            <p className="font-semibold text-sm text-heading">Reports</p>
            <p className="text-sm text-muted mt-0.5">Revenue and performance reports</p>
          </div>
        </Link>
        <Link
          href="/products"
          className="flex items-center gap-4 p-4 card hover:bg-grey-subtle transition-colors"
          style={{ textDecoration: 'none' }}
        >
          <span className="text-accent">
            <IconPackage />
          </span>
          <div>
            <p className="font-semibold text-sm text-heading">Products</p>
            <p className="text-sm text-muted mt-0.5">Manage classes, trainings, and retreats</p>
          </div>
        </Link>
      </div>
    </div>
  )
}
