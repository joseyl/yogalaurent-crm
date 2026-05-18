import Link from 'next/link'
import { BarChart3, Package } from 'lucide-react'

export default function MorePage() {
  return (
    <div className="pb-24 px-6 pt-6 max-w-lg">
      <h1 className="font-bold mb-6" style={{ fontSize: '22px', color: '#1A2C4E' }}>More</h1>
      <div className="flex flex-col gap-3">
        <Link
          href="/reports"
          className="flex items-center gap-4 p-4 border border-[#e5e7eb] hover:bg-gray-50 transition-colors"
          style={{ borderRadius: 0, textDecoration: 'none' }}
        >
          <span style={{ color: '#1A2C4E' }}>
            <BarChart3 size={28} />
          </span>
          <div>
            <p className="font-semibold text-base" style={{ color: '#1A2C4E' }}>Reports</p>
            <p className="text-sm text-gray-500">Revenue and performance reports</p>
          </div>
        </Link>
        <Link
          href="/products"
          className="flex items-center gap-4 p-4 border border-[#e5e7eb] hover:bg-gray-50 transition-colors"
          style={{ borderRadius: 0, textDecoration: 'none' }}
        >
          <span style={{ color: '#1A2C4E' }}>
            <Package size={28} />
          </span>
          <div>
            <p className="font-semibold text-base" style={{ color: '#1A2C4E' }}>Products</p>
            <p className="text-sm text-gray-500">Manage classes, trainings, and retreats</p>
          </div>
        </Link>
      </div>
    </div>
  )
}
