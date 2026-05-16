import Nav from '@/app/components/Nav'
import ActorCard from '@/app/components/ActorCard'
import Link from 'next/link'

export default function PartnerTypePicker() {
  return (
    <>
      <Nav />
      <main className="container">
        <Link href="/" className="back-btn">← Back</Link>
        <div className="picker-hero">
          <h1 className="page-title">What kind of partner are you?</h1>
          <p className="page-subtitle">We'll tailor your registration to collect the right information.</p>
        </div>
        <div className="actor-grid">
          <ActorCard
            icon="🏢"
            title="Corporate Partner"
            description="Offer pilot programmes, API access, distribution, or co-marketing to startups in the ecosystem."
            ctaLabel="Register →"
            ctaVariant="outline"
            href="/partner/corporate"
          />
          <ActorCard
            icon="💰"
            title="Investor"
            description="VC, angel, or family office looking for deal flow within the Cradle ecosystem."
            ctaLabel="Register →"
            ctaVariant="outline"
            href="/partner/investor"
          />
          <ActorCard
            icon="🔧"
            title="Service Provider"
            description="Legal, accounting, cloud, marketing, or regulatory support for early-stage startups."
            ctaLabel="Register →"
            ctaVariant="outline"
            href="/partner/service"
          />
        </div>
      </main>
    </>
  )
}
