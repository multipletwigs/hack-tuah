import Link from 'next/link'

interface Props {
  rightLabel?: string
  rightHref?: string
}

export default function Nav({ rightLabel, rightHref }: Props) {
  return (
    <nav className="nav">
      <Link href="/" className="nav-logo">Cradle Portal</Link>
      {rightLabel && rightHref && (
        <Link href={rightHref} className="nav-link">{rightLabel}</Link>
      )}
    </nav>
  )
}
