import Link from 'next/link'

interface Props {
  icon: string
  title: string
  description: string
  ctaLabel: string
  ctaVariant?: 'primary' | 'outline'
  href?: string
  onClick?: () => void
}

export default function ActorCard({ icon, title, description, ctaLabel, ctaVariant = 'primary', href, onClick }: Props) {
  const inner = (
    <>
      <span className="actor-icon">{icon}</span>
      <h2 className="actor-card-title">{title}</h2>
      <p className="actor-card-desc">{description}</p>
      <span className={`btn actor-card-cta ${ctaVariant === 'outline' ? 'btn-outline' : 'btn-primary'}`}>{ctaLabel}</span>
    </>
  )

  if (href) {
    return <Link href={href} className="actor-card">{inner}</Link>
  }

  return (
    <button className="actor-card" onClick={onClick} type="button">{inner}</button>
  )
}
