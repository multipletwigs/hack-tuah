interface Props {
  status: 'active' | 'pending' | 'closed'
}

export default function StatusBadge({ status }: Props) {
  return (
    <span className={`status-badge status-${status}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}
