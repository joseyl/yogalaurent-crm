import LoadingSpinner from '@/app/components/LoadingSpinner'

export default function Loading() {
  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] md:min-h-screen">
      <LoadingSpinner message="Loading leads..." />
    </div>
  )
}
