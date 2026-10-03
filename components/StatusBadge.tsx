interface StatusBadgeProps {
  status: string
  type?: 'person' | 'lead'
}

const personConfig: Record<string, { bg: string; text: string; label: string }> = {
  client:   { bg: '#ECFDF3', text: '#12B76A', label: 'Client' },
  lead:     { bg: '#FFFAEB', text: '#F79009', label: 'Lead' },
  inactive: { bg: '#F2F4F7', text: '#667085', label: 'Inactive' },
  deceased: { bg: '#FEF3F2', text: '#F04438', label: 'Deceased' },
  classes:  { bg: '#F2F4F7', text: '#667085', label: 'Classes' },
  training: { bg: '#F2F4F7', text: '#667085', label: 'Training' },
  retreat:  { bg: '#F2F4F7', text: '#667085', label: 'Retreat' },
  workshop: { bg: '#F2F4F7', text: '#667085', label: 'In-person Workshop' },
  private:  { bg: '#F2F4F7', text: '#667085', label: 'Private' },
  other:    { bg: '#F2F4F7', text: '#667085', label: 'Other' },
}

const leadConfig: Record<string, { bg: string; text: string; label: string }> = {
  new:       { bg: '#EFF8FF', text: '#1570EF', label: 'New' },
  contacted: { bg: '#FFFAEB', text: '#F79009', label: 'Contacted' },
  quoted:    { bg: '#F4F3FF', text: '#6941C6', label: 'Quoted' },
  converted: { bg: '#ECFDF3', text: '#12B76A', label: 'Converted' },
  dead:      { bg: '#F2F4F7', text: '#667085', label: 'Dead' },
}

export default function StatusBadge({ status, type = 'person' }: StatusBadgeProps) {
  const config = type === 'lead' ? leadConfig : personConfig
  const entry = config[status] ?? { bg: '#F2F4F7', text: '#667085', label: status }

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        background: entry.bg,
        color: entry.text,
        padding: '2px 10px',
        fontSize: '12px',
        fontWeight: 500,
        borderRadius: '9999px',
      }}
    >
      {entry.label}
    </span>
  )
}
