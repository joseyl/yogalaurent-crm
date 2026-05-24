interface LoadingSpinnerProps {
  message?: string
}

export default function LoadingSpinner({ message }: LoadingSpinnerProps) {
  return (
    <div className="flex flex-col items-center justify-center w-full min-h-[60vh] gap-4">
      <div className="flex items-center gap-2">
        <span
          className="w-2.5 h-2.5 rounded-full bg-[#1A2C4E] animate-pulse"
          style={{ animationDelay: '0s' }}
        />
        <span
          className="w-2.5 h-2.5 rounded-full bg-[#1A2C4E] animate-pulse"
          style={{ animationDelay: '0.2s' }}
        />
        <span
          className="w-2.5 h-2.5 rounded-full bg-[#1A2C4E] animate-pulse"
          style={{ animationDelay: '0.4s' }}
        />
      </div>
      {message && (
        <p className="text-sm text-gray-400">{message}</p>
      )}
    </div>
  )
}
