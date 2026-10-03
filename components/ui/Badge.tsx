type Tone = 'green' | 'amber' | 'red' | 'grey' | 'teal'

const toneClasses: Record<Tone, string> = {
  green: 'bg-green-subtle text-green-vivid',
  amber: 'bg-amber-subtle text-amber-vivid',
  red:   'bg-red-subtle text-red-vivid',
  grey:  'bg-grey-subtle text-grey-vivid',
  teal:  'bg-accent-tint text-accent',
}

interface BadgeProps {
  tone?: Tone
  children: React.ReactNode
}

export default function Badge({ tone = 'grey', children }: BadgeProps) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${toneClasses[tone]}`}>
      {children}
    </span>
  )
}
