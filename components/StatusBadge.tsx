interface StatusBadgeProps {
  status: string
  type?: 'person' | 'lead'
}

const personConfig: Record<string, { bg: string; text: string; label: string }> = {
  client:   { bg: '#dcfce7', text: '#166534', label: 'Client' },
  lead:     { bg: '#fef9c3', text: '#854d0e', label: 'Lead' },
  inactive: { bg: '#f3f4f6', text: '#6b7280', label: 'Inactive' },
  deceased: { bg: '#fee2e2', text: '#991b1b', label: 'Deceased' },
  classes:  { bg: '#f3f4f6', text: '#6b7280', label: 'Classes' },
  training: { bg: '#f3f4f6', text: '#6b7280', label: 'Training' },
  retreat:  { bg: '#f3f4f6', text: '#6b7280', label: 'Retreat' },
  workshop: { bg: '#f3f4f6', text: '#6b7280', label: 'In-person Workshop' },
  private:  { bg: '#f3f4f6', text: '#6b7280', label: 'Private' },
  other:    { bg: '#f3f4f6', text: '#6b7280', label: 'Other' },
}

const leadConfig: Record<string, { bg: string; text: string; label: string }> = {
  new:       { bg: '#dbeafe', text: '#1e40af', label: 'New' },
  contacted: { bg: '#fef9c3', text: '#854d0e', label: 'Contacted' },
  quoted:    { bg: '#ede9fe', text: '#5b21b6', label: 'Quoted' },
  converted: { bg: '#dcfce7', text: '#166534', label: 'Converted' },
  dead:      { bg: '#f3f4f6', text: '#6b7280', label: 'Dead' },
}

export default function StatusBadge({ status, type = 'person' }: StatusBadgeProps) {
  const config = type === 'lead' ? leadConfig : personConfig
  const entry = config[status] ?? { bg: '#f3f4f6', text: '#6b7280', label: status }

  return (
    <span
      style={{
        display: 'inline-block',
        background: entry.bg,
        color: entry.text,
        padding: '2px 8px',
        fontSize: '12px',
        fontWeight: 500,
        borderRadius: 0,
      }}
    >
      {entry.label}
    </span>
  )
}
